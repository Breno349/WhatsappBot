import makeWASocket, { Browsers, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, getContentType, useMultiFileAuthState } from "@whiskeysockets/baileys"
import { config } from "./tools/config.js"
import { useDBAuth,deletarSessaoDB } from "./tools/useDBAuth.js"
import qrcode from "qrcode-terminal"
import pino from "pino"
import { EventEmitter } from "events"
import fs from "fs"
import { validateCmd } from "./tools/usuarios.js"
import { Commands } from "./comandos.js"
import path from "path"
import os from "os"

export const Bot = {
    sock: null,
    event: new EventEmitter(),
    start: async () => {
        console.log('\x1b[32m%s\x1b[0m', '<<===  Conectando Bot ===>>')
        return await startWA()
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const ignoreTypes = ['pollUpdateMessage','senderKeyDistributionMessage']

function parseMessage( msg ){
    const isGroup = msg.key.remoteJid.endsWith("@g.us")
    const lid = isGroup ? msg.key.participant : msg.key.remoteJid;
    const isBot = msg.key?.fromMe ?? false;
    const msgType = Object.keys(msg.message)[0]
    const conteudo = msg.message[msgType];
    const text = msg.message?.conversation || conteudo?.text || conteudo?.caption || "";
    const name = msg.pushName ?? null;
    const contextInfo = conteudo?.contextInfo;
    const isQuoted = Boolean(contextInfo?.quotedMessage)
    const quotedMessage = isQuoted ? contextInfo.quotedMessage : null;
    const quotedType = isQuoted ? Object.keys(quotedMessage)[0] : null;
    const isView = isQuoted ? Boolean(quotedMessage[quotedType]?.viewOnce) : Boolean(conteudo?.viewOnce);
    const quotedLid = isQuoted ? contextInfo?.participant : null;
    const mentions = contextInfo?.mentionedJid ?? []

    return {
        text, name, lid, msgType, quotedLid, quotedMessage, quotedType, isBot, isGroup, isQuoted, isView, mentions
    }
}

const execucoesAtivas = new Map();
let proximoId = 1;
function executar(nomeComando, ctx, data) {
  const id = proximoId++;
  const promise = Promise.resolve()
    .then(async () => {
        if(data.exec){
            await Commands[nomeComando].handler(ctx, data.args);
        } else {
            const errorHandler = (Commands[nomeComando].error ?? ((ctx, motivo) => ctx.replyText(`Erro: ${motivo}`)));
            await errorHandler(ctx, data.error);
        }
    })
    .catch((erro) => {
      console.log(`Erro na execução #${id} (${nomeComando}):`, erro.message);
    })
    .finally(() => {
      execucoesAtivas.delete(id);
    });
  execucoesAtivas.set(id, { promise, comando: nomeComando, iniciadoEm: Date.now() });
  return id;
}

async function download(msg,marcada=false) {
    let m = null;
    if(marcada){
        m = {
            key: {
                remoteJid: msg.key.remoteJid,
                id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id,
                participant: msg.message?.extendedTextMessage?.contextInfo?.participant
            },
            message: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.imageMessage?.contextInfo?.quotedMessage || msg.message?.stickerMessage?.contextInfo?.quotedMessage
        }
    } else {
        m = msg;
    }
    const tipo = Object.keys(m.message)[0]
    const tipos = ['imageMessage','videoMessage','audioMessage','stickerMessage']
    const extensoes = ['jpeg','mp4','.mp3','webp']
    if(tipos.includes(tipo)){
        const stream = await downloadMediaMessage(
            m,
            'stream',
            { },
            {
                logger: pino({level:'silent'}),
                reuploadRequest: Bot.sock.updateMediaMessage
            }
        )
        const extensao = extensoes[ tipos.indexOf(tipo) ]
        const nomeArquivo = `midia_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extensao}`;
        const caminho = path.join(os.tmpdir(), nomeArquivo);

        await fs.promises.writeFile(caminho, stream);
        return caminho;
    } else {
        console.log(tipo+' não é midia para baixar')
        return null;
    }
}


let codeRequested = false;

export async function startWA( tentativa = 0 ){
    if(tentativa >= 5){
        Bot.event.emit("error", {
            state: "closed",
            statusCode: null
        })
        return;
    }
    const { state, saveCreds } = config.login_mode === "file" ?
        await useMultiFileAuthState( config.login_name ) :
        await useDBAuth( config.login_name )
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        logger: pino({level:"silent"}),
        //markOnlineOnConnect: false,
        version: version,
        syncFullHistory: false
    })

    // salvando credenciais
    sock.ev.on("creds.update", saveCreds)

    // atualizações da coneção
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if(qr && !codeRequested){
            if(config.login_method === "code"){
                const code = await sock.requestPairingCode( config.phone_number )
                    .catch(erro => {
                        Bot.event.emit("error", {
                            from: "code",
                            message: erro.message
                        })
                        return null;
                    });
                if(code) {
                    Bot.event.emit("login", {
                        from: "code",
                        code: code
                    })
                    codeRequested = true;
                } else {
                    codeRequested = false;
                }
            } else if(config.login_method === "qrcode"){
                qrcode.generate(qr, { small: true }, (qrstr) => {
                    codeRequested = true;
                    Bot.event.emit("login", {
                        from: "qrcode",
                        code: qrstr
                    })
                }).catch(erro => {
                    codeRequested = false;
                    Bot.event.emit("error", {
                        from: "qrcode",
                        message: erro.message
                    })
                })
            }
        }
        if(connection === "close"){
            const statusCode = (lastDisconnect?.error?.output?.statusCode);
            switch( statusCode ){
                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                case DisconnectReason.timedOut:
                case DisconnectReason.restartRequired:
                    Bot.event.emit("connecting",{
                        state: "reconnecting",
                        statusCode: statusCode,
                        reason: DisconnectReason[statusCode] ?? null
                    })
                    codeRequested = false;
                    Bot.sock = null;
                    sock.ev.removeAllListeners()
                    sock.ws.close()

                    await delay(5000)
                    return await startWA( tentativa + 1 )
                break;
                case DisconnectReason.connectionReplaced:
                    Bot.event.emit("connecting",{
                        state: "closed",
                        statusCode: statusCode,
                        reason: DisconnectReason[statusCode] ?? null
                    })
                break;
                case DisconnectReason.loggedOut:
                case DisconnectReason.badSession:
                    Bot.event.emit("connecting",{
                        state: "restarted",
                        statusCode: statusCode,
                        reason: DisconnectReason[statusCode] ?? null
                    })
                    await deleteSessaoAtual()
                    codeRequested = false;
                    Bot.sock = null;
                    sock.ev.removeAllListeners()
                    sock.ws.close()

                    await delay(5000)
                    return await startWA(tentativa + 1)
                    break;
                default:
                    Bot.event.emit("connecting",{
                        state: "unknown",
                        statusCode: statusCode
                    })

                    await delay(5000)
                    return await startWA( tentativa + 1 )
                    break;
            }
        } else if(connection === "open"){
            Bot.event.emit("connecting", {
                state: "connected",
                sock
            })
            Bot.sock = sock;
        }
    });

    // mensagems
    sock.ev.on("messages.upsert", async ({ type,messages }) => {
        if(type === "notify"){
            for(const m of messages){
                if(!m.message) continue;
                //console.log(m)
                const {text, name, lid, msgType, quotedLid, quotedMessage, quotedType, isBot, isGroup, isQuoted, isView, mentions} = parseMessage(m)
                console.log(text)
                if(ignoreTypes.includes(msgType)) continue;
                if(!text.startsWith(config.prefixo)) continue;
                const [cmd, ...args] = text.slice(config.prefixo.length).trim().split(/\s+/);
                if(!Commands[cmd]) continue;
                const ctx = {
                    text, name, args, lid, msgType, quotedLid, quotedMessage, quotedType, isBot, isGroup, isQuoted, isView, mentions, m,
                    replyText: async (txt) => await sock.sendMessage(m.key.remoteJid, { text: txt }, { quoted: m }),
                    editMsg: async (txt) => await sock.sendMessage(m.key.remoteJid, { text: txt, edit: m.key }),
                    replyFig: async (buffer) => await sock.sendMessage(m.key.remoteJid, { sticker: { url: buffer } }, { quoted: m }),
                    replyImage: async (buffer,caption='') => await sock.sendMessage(m.key.remoteJid, {image: {url: buffer}, caption}, { quoted: m } ),
                    replyImageToPrivate: async (buffer,caption='') => await sock.sendMessage(lid, {image: {url: buffer}, caption}, { quoted: m } ),
                    replyVideo: async (buffer,caption='') => await sock.sendMessage(m.key.remoteJid, {video: {url: buffer}, caption}, { quoted: m } ),
                    replyVideoToPrivate: async (buffer,caption='') => await sock.sendMessage(lid, {video: {url: buffer}, caption}, { quoted: m } ),
                    downloadMidia: async (marcada=false) => await download(m, marcada)
                }
                const resultValideted = await validateCmd( ctx, Commands[cmd], cmd )
                executar(cmd, ctx, resultValideted)
            }
        } else {
            // mensagens antigas entre outras
            //console.log(messages)
        }
    })
}

async function deleteSessaoAtual(){
    if(config.login_mode === "file"){
        try {
            await fs.promises.rm( config.login_name, {
                recursive: true,
                force: true
            })
            return true;
        } catch (erro){
            Bot.event.emit("error", {
                from: "deleteSession",
                message: erro.message
            })
            return false;
        }
    } else if(config.login_mode === "db"){
        // chamar uma função de apagar minha sessão no mesmo arquivo que salva as chaves e a sessão
        // a possui um try/catch interno
        const res = await deletarSessaoDB( config.login_name )
        return res;
    }
}
