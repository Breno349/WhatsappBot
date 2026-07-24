require('dotenv').config({quiet:true});
const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode'); // Mudado para gerar imagem no navegador
const logger = pino({ level: 'silent' });

const { COMMANDS } = require('./commands.js');
const { carregarSticker } = require('./tools_bot/stickers.js');
const { adicionar, remover, obter, listar } = require('./tools_bot/listaUsuarios.js');

const PREFIX = process.env.PREFIX || '.';
const PORT = process.env.PORT || 3000;

// Variáveis de estado para a API e o Bot
let sock;
let currentQR = null;
let isConnected = false;

// ==========================================
// CONFIGURAÇÃO DA API (EXPRESS)
// ==========================================
const app = express();
app.use(express.json());

// Rota para verificar ou escanear o QR Code
app.get('/qrcode', async (req, res) => {
    if (isConnected) {
        return res.status(200).send('<h3>O bot já está conectado!</h3>');
    }
    if (!currentQR) {
        return res.status(202).send('<h3>O QR Code ainda está sendo gerado. Recarregue a página em alguns segundos...</h3>');
    }

    try {
        // Gera uma imagem base64 do QR Code para exibir no navegador
        const qrImage = await QRCode.toDataURL(currentQR);
        return res.send(`
            <h2>Escaneie o QR Code abaixo:</h2>
            <img src="${qrImage}" alt="QR Code WhatsApp" style="width: 300px; height: 300px;" />
            <p>Recarregue a página se demorar muito para escanear.</p>
        `);
    } catch (error) {
        return res.status(500).send('Erro ao processar a imagem do QR Code.');
    }
});

// Rota para manter a aplicação acordada (Aceita GET e POST)
app.all('/acordar', (req, res) => {
    res.status(200).send('OK');
});

// Inicializa a API
app.listen(PORT, () => {
    console.log(`🌐 API rodando na porta ${PORT}`);
    console.log(`-> QR Code disponível em: http://localhost:${PORT}/qrcode`);
    console.log(`-> Endpoint de ping em: http://localhost:${PORT}/acordar`);
});

// ==========================================
// FUNÇÕES DO BOT
// ==========================================
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

async function baixarMidia(msg) {
  if (!sock) throw new Error('Socket não está pronto');
  const buffer = await downloadMediaMessage(
    msg,
    'buffer',
    {},
    { logger, reuploadRequest: sock.updateMediaMessage }
  );
  return buffer;
}

const commandQueue = [];
let isProcessing = false;

function enqueueCommand(job) {
  commandQueue.push(job);
  processQueue();
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (commandQueue.length > 0) {
    const job = commandQueue.shift();
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
        const { state, saveCreds } = await useMultiFileAuthState(process.env.AUTH_PATH || './auth_info');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: true, // Mantém no terminal caso ainda queira ver por lá
            browser: ['Bot WhatsApp API', 'Chrome', '1.0.0'],
        });

        sock.ev.on('creds.update', saveCreds); 

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                currentQR = qr; // Salva o QR code para a API renderizar
                isConnected = false;
            }
            
            if (connection === 'close') {
                isConnected = false;
                currentQR = null;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log('Conexão fechada.', statusCode, '- Reconectando:', shouldReconnect);
                if (shouldReconnect) {
                    startBot();
                } else {
                    console.log('Sessão deslogada. Apague a pasta de autenticação e escaneie o QR novamente.');
                }
            } else if (connection === 'open') {
                isConnected = true;
                currentQR = null; // Limpa o QR code da memória após conectar
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
                
                const info = obter(senderJid);
                const OnList = info !== null;
                
                const ctx = {
                    msg, args, isGroup, isOwner, senderJid, senderName, tipo, isQuoted, quotedMessage, OnList,
                    replyText: async (texto) => await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg }),
                    replyAudio: async (buffer) => await sock.sendMessage(msg.key.remoteJid,{ audio: buffer, mimetype: 'audio/mp4', ptt: false },{ quoted: msg }),
                    replyVideo: async (buffer) => await sock.sendMessage(msg.key.remoteJid, { video: buffer, mimetype: 'video/mp4', caption: '' }, { quoted: msg }),
                    replyImage: async (buffer, caption = '') => await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption }, { quoted: msg }),
                    replySticker: async (nome) => {
                        try {
                            const buffer = carregarSticker(nome);
                            await sock.sendMessage(msg.key.remoteJid, { sticker: buffer }, { quoted: msg });
                        } catch (erro) {
                            console.log('Erro ao enviar figurinha:', erro.message);
                        }
                    },
                };
                
                if(ctx.OnList){
                    await userMuted(ctx, info);
                    continue;
                }
                
                enqueueCommand(() => COMMANDS[command](ctx));
            }
        });

    } catch (erro){
        console.log('Erro: ' + erro.message);
    }
}

async function userMuted(ctx, info){
    if(info?.informado === false){
        await ctx.replyText(`> Mermão tu ta mutado...\nmotivo: *${obter(ctx.senderJid).motivo}*`);
        adicionar(ctx.senderJid, true, info.motivo);
    }
}

startBot().catch((err) => {
  console.error('Erro ao iniciar o bot:', err);
});
