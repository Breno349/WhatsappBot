import makeWASocket, { DisconnectReason, downloadMediaMessage, Browsers, fetchLatestBaileysVersion, useMultiFileAuthState, getContentType } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino';
import { EventEmitter } from 'events';
import { config } from "./tools/config.js";
import { Commands } from './tools/Comandos.js';
import { usePostgresAuthState, removerLogin } from './tools/pgAuthState.js'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { isMuted } from './tools/usuarios.js';
import { listarLembrete, removerLembrete } from './tools/lembretes.js';

export const Bot = new EventEmitter();
let sock = null;
let saveCredsGlobal = null;

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function tratarLembretes(sock){
    await setInterval(async () => {
        try {
            if(!sock || !sock.sendMessage){
                console.log('Sock inválido')
                return;
            }
            const notas = await listarLembrete(null,true)
            for(const nota of notas){
                if(nota.gatilho >= Date.now()) continue;
                await sock.sendMessage(nota.para, { text: `${nota.texto}\n> Mensagem Programada` })
                if(nota.de !== nota.para) await sock.sendMessage(nota.de, { text: `Lembrete: [#${nota.id}] Enviada` })
                await removerLembrete(nota.id)
            }
        } catch (erro){
            console.log('Erro ao tratar lembretes: '+erro.message)
        }
    }, 3*1000);
}

// tratar de executar comandos paralelamente
const execucoesAtivas = new Map();
let proximoId = 1;
function executar(nomeComando, ctx) {
  const id = proximoId++;

  const promise = Promise.resolve()
    .then(() => Commands[nomeComando](ctx))
    .catch((erro) => {
      console.log(`Erro na execução #${id} (${nomeComando}):`, erro.message);
    })
    .finally(() => {
      execucoesAtivas.delete(id);
    });

  execucoesAtivas.set(id, { promise, comando: nomeComando, iniciadoEm: Date.now() });
  return id;
}
// baixar midia da mensagem
async function baixar(msg,marcada=false) {
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
                reuploadRequest: sock.updateMediaMessage
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
// obter informações da mensagem
function fromMsg(msg){
    const isGrupo = msg.key.remoteJid.endsWith('@g.us');
    const isBot = msg.key.fromMe;
    const jid = isGrupo ? msg.key.participant : msg.key.remoteJid;
    const message = msg.message;
    const tipo =  Object.keys(message)[0]
    const conteudo = message[tipo];
    const texto = message.conversation || message.extendedTextMessage?.text || conteudo?.caption || '';
    const nome = msg.pushName ?? '~';
    const contextInfo = conteudo?.contextInfo;
    const isQuoted = Boolean(contextInfo?.quotedMessage);
    const quotedTipo = isQuoted ? Object.keys(contextInfo?.quotedMessage)[0] : null;
    const mencionados = contextInfo?.mentionedJid ?? []
    const isView = isQuoted ? Boolean(contextInfo.quotedMessage[quotedTipo].viewOnce) : Boolean(conteudo.viewOnce)

    return {
        isGrupo,
        isBot,
        isQuoted,
        isView,
        jid,
        tipo,
        texto,
        nome,
        mencionados,
        quoted: contextInfo?.quotedMessage,
        quotedTipo,
        quotedParticipant: contextInfo?.participant,
    }
}

// iniciar o bot
export async function iniciarBot(){
    try {
        const { state, saveCreds } = config.isDB ?
            await usePostgresAuthState(config.session_name) :
            await useMultiFileAuthState(config.session_name);
        const { version } = await fetchLatestBaileysVersion();
        saveCredsGlobal = saveCreds;
        sock = makeWASocket({
            auth: state,
            browser: Browsers.ubuntu("Chrome"),
            logger: pino({level:'silent'}),
            version: version,
            syncFullHistory: false
        });
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            //console.log(update)

            if(qr){
                // qr/code disponível
                if(config.isQRCode){
                    qrcode.generate(qr, {small:true}, (qrCodeString) =>  {
                        Bot.emit('qrcode', qrCodeString)
                    })
                } else if(config.isCode){
                    if (!sock.authState.creds.registered) {
                        delay(2000)
                        const code = await pairCode(sock)
                        if(code){
                            Bot.emit('code', code)
                        } else {
                            Bot.emit('fail', 'Erro ao onter CODE.')
                        }
                    }
                } else {
                    //console.log('Nenhum método de login adotado!')
                    Bot.emit('erro', 'Nenhum método de login adotado!')
                }
            }

            if(connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
                //console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
                if(shouldReconnect) {
                    Bot.emit('status', 'reconectando')
                    delay(2000)
                    await iniciarBot();
                } else {
                    if(lastDisconnect.error?.output?.statusCode === 401){
                        Bot.emit('status', 'deslogado')
                    } else {
                        Bot.emit('status', 'desconectado')
                    }
                }
            } else if(connection === 'open') {
                //console.log('opened connection')
                Bot.emit('status', 'conectado')
                tratarLembretes(sock)
            }
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for(const msg of messages){
                if(!msg.message) continue;
                // puxar informações da mensagem
                const { isGrupo,isBot,isQuoted,isView,jid,tipo,texto,nome,mencionados,quoted,quotedTipo,quotedParticipant } = fromMsg(msg);
                // verificar se é um comando
                if(!texto.startsWith(config.prefixo)) continue;
                const [rawcmd, ...args] = texto.slice(config.prefixo.length).trim().split(/\s+/);
                const cmd = rawcmd.toLowerCase();
                // verificar se o comando é valido
                if(!Commands[cmd]) continue;  // implementação de um validador de usuário??
                // se a pessoa estiver marcada como mutada
                if(!isBot && (await isMuted(jid))){
                    await sock.sendMessage(msg.key.remoteJid,{react: {text: '🤫', key: msg.key}})
                    continue;
                }
                const ctx = {
                    nome, jid, tipo, args, msg, isBot, isGrupo, isQuoted, isView, quoted, quotedTipo, config, mencionados,
                    baixar: async (aMarcada = false) => await baixar(msg,aMarcada),
                    responderTexto: async (txt) => await sock.sendMessage(msg.key.remoteJid, { text: txt }, { quoted: msg }),
                    editarTexto: async (txt) => await sock.sendMessage(msg.key.remoteJid, { text: txt, edit: msg.key }),
                    responderImage: async (pth,caption='') => await sock.sendMessage(msg.key.remoteJid, {image: {url: pth}, caption}, { quoted: msg } ),
                    responderVideo: async (pth,caption='') => await sock.sendMessage(msg.key.remoteJid, {video: {url: pth}, caption}, { quoted: msg } ),
                    privadoImage: async (pth,caption='') => await sock.sendMessage(jid, {image: {url: pth}, caption}, { quoted: msg } ),
                    privadoVideo: async (pth,caption='') => await sock.sendMessage(jid, {video: {url: pth}, caption}, { quoted: msg } ),
                    responderFigura: async (pth) => await sock.sendMessage(msg.key.remoteJid, {sticker: {url: pth}}, { quoted: msg } ),
                    responderReact: async (char) => await sock.sendMessage(msg.key.remoteJid,{react: {text: char, key: msg.key}}),
                    obterInfoGrupo: async () => await sock.groupMetadata(msg.key.remoteJid),
                    atualizarFotoGrupo: async (buffer) => await sock.updateProfilePicture(msg.key.remoteJid, { url: buffer }),
                    atualizarNomeGrupo: async (nvnome) => await sock.groupUpdateSubject(msg.key.remoteJid, nvnome),
                    atualizarDescGrupo: async (nvdesc) => await sock.groupUpdateDescription(msg.key.remoteJid, nvdesc),
                    adiconarPessoaAoGrupo: async (njid,promov=false) => await sock.groupParticipantsUpdate(msg.key.remoteJid, [njid], !promov ? "add" : "promote"),
                    removerPessoaAoGrupo: async (njid) => await sock.groupParticipantsUpdate(msg.key.remoteJid, [njid], "remove" ),
                    verificarPessoa: async (njid) => await sock.onWhatsApp(njid),
                    obterLid: async (jid) => await sock.signalRepository.lidMapping.getLIDForPN(jid),
                };
                executar(cmd, ctx)
            }
        })
    } catch(err){
        //console.log('Erro ao iniciar bot: '+err.message)
        Bot.emit('erro', 'Erro ao iniciar bot: '+err.message)
    }
}

// fechar boy
export async function fecharBot(){
    try {
        if(!sock && !saveCredsGlobal){
            console.log('Erro ao fechar bot: [sock] ou [saveCreds] inválidas')
            return false;
        }
        await sock.ws.close()
        await saveCredsGlobal()
    } catch(err){
        console.log('Erro ao fechar bot: '+err.message)
        return false;
    }
}

// solicitar código
async function pairCode(sock){
    try {
        const number = String(config.admin_phone);
        const code = await sock.requestPairingCode(number)
        return code;
    } catch (err){
        console.log('Erro pairCode: '+err.message)
        return null;
    }
}
