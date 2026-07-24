require('dotenv').config({quiet:true});
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const { usePostgresAuthState } = require('./tools_bot/pgAuthState.js');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const logger = pino({ level: 'silent' });
const { COMMANDS } = require('./commands.js')
const fs = require('fs');
const path = require('path');
const os = require('os');
const { carregarSticker } = require('./tools_bot/stickers.js');
const { adicionar, remover, marcarInformado, obter, listar } = require('./tools_bot/listaUsuarios.js');

const PREFIX = process.env.PREFIX || '.'

function analisarMensagem(msg) {
  const isGroup = msg.key.remoteJid.endsWith('@g.us');
  const isOwner = msg.key.fromMe;
  const senderJid = isGroup ? msg.key.participant : msg.key.remoteJid;

  const message = msg.message;
  const tipo = Object.keys(message)[0];
  const conteudo = message[tipo];

  const contextInfo = conteudo?.contextInfo;
  const isQuoted = Boolean(contextInfo?.quotedMessage);

  const senderName = msg.pushName || '~~';

  const texto =
    message.conversation ||
    message.extendedTextMessage?.text ||
    conteudo?.caption ||
    '';

  return {
    isGroup,
    isOwner,
    senderJid,
    tipo,
    texto,
    isQuoted,
    quotedMessage: contextInfo?.quotedMessage,
    quotedParticipant: contextInfo?.participant,
    senderName
  };
}
const commandQueue = [];
let isProcessing = false;
function enqueueCommand(job) {
  commandQueue.push(job);
  processQueue(); // tenta iniciar o processamento (se já não estiver rodando)
}
async function baixarMidia(msg, sock, baixarQuoted = false) {
  if (!sock || !sock.updateMediaMessage) {
    console.log('Erro ao baixar midia: Instância do "sock" inválida.');
    return null;
  }

  try {
    let mensagemParaDownload = msg;

    // Se o usuário pediu para baixar a mensagem marcada (quoted)
    if (baixarQuoted) {
      const conteudoQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage 
                          || msg.message?.imageMessage?.contextInfo?.quotedMessage; // Fallback caso varie

      if (!conteudoQuoted) {
        console.log('Nenhuma mensagem citada encontrada para download.');
        return null;
      }

      // Reconstrói o objeto no formato que o downloadMediaMessage do Baileys exige
      mensagemParaDownload = {
        key: {
          remoteJid: msg.key.remoteJid,
          id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id,
          participant: msg.message?.extendedTextMessage?.contextInfo?.participant
        },
        message: conteudoQuoted
      };
    }

    // Faz o download usando a estrutura reconstruída
    const buffer = await downloadMediaMessage(
      mensagemParaDownload,
      'buffer',
      {},
      { 
        logger: console, 
        reuploadRequest: sock.updateMediaMessage 
      }
    );

    if (!buffer) return null;

    // Detecta a extensão do arquivo
    const estruturaMensagem = mensagemParaDownload.message || {};
    const tipoMensagem = Object.keys(estruturaMensagem)[0];
    let extensao = 'bin';

    if (tipoMensagem === 'imageMessage') extensao = 'jpg';
    else if (tipoMensagem === 'videoMessage') extensao = 'mp4';
    else if (tipoMensagem === 'audioMessage') extensao = 'mp3';
    else if (tipoMensagem === 'stickerMessage') extensao = 'webp';

    const nomeArquivo = `midia_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extensao}`;
    const caminhoArquivo = path.join(os.tmpdir(), nomeArquivo);

    await fs.promises.writeFile(caminhoArquivo, buffer);
    return caminhoArquivo;

  } catch (err) {
    console.log('Erro interno ao baixar midia:', err.message);
    return null;
  }
}
async function processQueue() {
  if (isProcessing) return; // já tem um loop rodando, esse job será pego por ele
  isProcessing = true;

  while (commandQueue.length > 0) {
    const job = commandQueue.shift(); // tira o primeiro da fila (FIFO)
    try {
      await job();
    } catch (erro) {
      console.log('Erro ao processar comando:', erro.message);
    }
  }

  isProcessing = false;
}
async function startBot(){
    try {
        //const { state, saveCreds } = await useMultiFileAuthState(process.env.AUTH_PATH);
        const { state, saveCreds } = await usePostgresAuthState(process.env.AUTHID ?? 'meu-bot');
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: false,
            browser: ['Bot WhatsApp', 'Chrome', '1.0.0'],
        });
        sock.ev.on('creds.update', saveCreds); 
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log('\nEscaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):\n');
                qrcode.generate(qr, { small: true });
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log('Conexão fechada.', statusCode, '- Reconectando:', shouldReconnect);
                if (shouldReconnect) {
                    startBot();
                } else {
                    console.log('Sessão deslogada. Apague is dadis de ligin e escaneie o QR novamente.');
                }
            } else if (connection === 'open') {
                console.log('✅ Bot conectado ao WhatsApp com sucesso!');
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (!msg.message) continue;
                const { isGroup, isOwner, senderJid, tipo, texto, isQuoted, quotedMessage, senderName } = analisarMensagem(msg);
                if (!texto.startsWith(PREFIX)) continue;
                const [rawCommand, ...args] = texto.slice(PREFIX.length).trim().split(/\s+/);
                const command = rawCommand.toLowerCase();
                if (!COMMANDS[command]) continue;
                const info = await obter( senderJid );
                const OnList = info!==null? true : false;
                try {
                  const ctx = {
                      msg, args, isGroup, isOwner, senderJid, senderName, tipo, isQuoted, quotedMessage, OnList,
                      replyText: async (texto) => await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg }),
                      replyAudio: async (buffer) => await sock.sendMessage(msg.key.remoteJid,{ audio: buffer, mimetype: 'audio/mp4', ptt: false },{ quoted: msg }),
                      replyVideo: async (buffer, legenda = '') => await sock.sendMessage(msg.key.remoteJid, { video: buffer, mimetype: 'video/mp4', caption: legenda }, { quoted: msg }),
                      replyImage: async (buffer, caption = '') => await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption }, { quoted: msg }),
                      replySticker: async (nome) => {try {const buffer = carregarSticker(nome);await sock.sendMessage(msg.key.remoteJid, { sticker: buffer }, { quoted: msg });} catch (erro) {console.log('Erro ao enviar figurinha:', erro.message);}},
                      baixarMidia: async (baixarQuoted = false) => {return await baixarMidia(msg, sock, baixarQuoted);}
                  };
                  if(ctx.OnList){
                      await userMuted(ctx,info);
                      continue;
                  }
                  enqueueCommand(() => COMMANDS[command](ctx));
                } catch (erro){
                  console.log("ERRO EM COMANDO: "+erro.message)
                }
            }
        });

    } catch (erro){
        console.log('Erro: '+erro.message)
    }
}
async function userMuted(ctx, info) {
  console.log('From Blocked')
  if (info?.informado === false) {
    await ctx.replyText(`> Mermão tu ta mutado...\nmotivo: *${info.motivo}*`);
    await marcarInformado(ctx.senderJid); // não toca no nivel, só marca o aviso como enviado
  }
}

startBot().catch((err) => {
  console.error('Erro ao iniciar o bot:', err);
});