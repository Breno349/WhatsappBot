require('dotenv').config({quiet:true});
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const logger = pino({ level: 'silent' });
const { COMMANDS } = require('./commands.js')
const { carregarSticker } = require('./tools_bot/stickers.js');

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
  };
}
async function baixarMidia(msg) {
  const buffer = await downloadMediaMessage(
    msg,
    'buffer', // pode ser 'buffer' ou 'stream'
    {},
    { logger, reuploadRequest: sock.updateMediaMessage }
  );
  return buffer; // Buffer com os bytes do arquivo
}

const commandQueue = [];
let isProcessing = false;

function enqueueCommand(job) {
  commandQueue.push(job);
  processQueue(); // tenta iniciar o processamento (se já não estiver rodando)
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
        const { state, saveCreds } = await useMultiFileAuthState(process.env.AUTH_PATH);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: false,
            browser: ['Bot WhatsApp', 'Chrome', '1.0.0'],
        });
        sock.ev.on('creds.update', saveCreds); 
        sock.ev.on('connection.update', (update) => {
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
                    console.log('Sessão deslogada. Apague a pasta auth_info e escaneie o QR novamente.');
                }
            } else if (connection === 'open') {
                console.log('✅ Bot conectado ao WhatsApp com sucesso!');
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (!msg.message) continue;
                const { isGroup, isOwner, senderJid, tipo, texto, isQuoted, quotedMessage } = analisarMensagem(msg);
                if (!texto.startsWith(PREFIX)) continue;
                const [rawCommand, ...args] = texto.slice(PREFIX.length).trim().split(/\s+/);
                const command = rawCommand.toLowerCase();
                if (!COMMANDS[command]) continue;
                const ctx = {
                    msg, args, isGroup, isOwner, senderJid, tipo, isQuoted, quotedMessage,
                    replyText: (texto) => sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg }),
                    replyAudio: (buffer) => sock.sendMessage(msg.key.remoteJid,{ audio: buffer, mimetype: 'audio/mp4', ptt: false },{ quoted: msg }),
                    replyVideo: (buffer) => sock.sendMessage(msg.key.remoteJid, { video: buffer, mimetype: 'video/mp4', caption: '' }, { quoted: msg }),
                    replyImage: (buffer, caption = '') => sock.sendMessage(msg.key.remoteJid, { image: buffer, caption }, { quoted: msg }),
                    replySticker: async (nome) => {try {const buffer = carregarSticker(nome);await sock.sendMessage(msg.key.remoteJid, { sticker: buffer }, { quoted: msg });} catch (erro) {console.log('Erro ao enviar figurinha:', erro.message);}},
                };
                enqueueCommand(() => COMMANDS[command](ctx));
            }
        });

    } catch (erro){
        console.log('Erro: '+erro.message)
    }
}

startBot().catch((err) => {
  console.error('Erro ao iniciar o bot:', err);
});