require('dotenv').config({ quiet: true });
const express = require('express');
const qrcodeImg = require('qrcode'); // Para gerar a imagem do QR Code na web
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const { usePostgresAuthState } = require('./tools_bot/pgAuthState.js');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal'); // Mantido para os logs do terminal
const logger = pino({ level: 'silent' });
const { COMMANDS } = require('./commands.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { carregarSticker } = require('./tools_bot/stickers.js');
const { adicionar, remover, marcarInformado, obter, listar } = require('./tools_bot/listaUsuarios.js');

// IMPORTANTE: Importe sua função do Telegram aqui
const { sendTelegramMessage,escapeMarkdownV2 } = require('./utils/telegram.js');

const PREFIX = process.env.PREFIX || '.';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Adicione isso no seu .env
const PORT = process.env.PORT || 3000;

let botStatus = 'offline';
let currentQR = '';
let sockInstance = null;

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
async function userMuted(ctx, info) {
  console.log('From Blocked')
  if (info?.informado === false) {
    await ctx.replyText(`> Mermão tu ta mutado...\nmotivo: *${info.motivo}*`);
    await marcarInformado(ctx.senderJid); // não toca no nivel, só marca o aviso como enviado
  }
}

async function startBot() {
    try {
        botStatus = 'iniciando';
        const { state, saveCreds } = await usePostgresAuthState(process.env.AUTHID ?? 'meu-bot');
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: false, // Desativado no baileys, vamos tratar manualmente
            browser: ['Bot WhatsApp WebService', 'Chrome', '1.0.0'],
        });
        
        sockInstance = sock; // Salva a instância globalmente se precisar manipular via API

        sock.ev.on('creds.update', saveCreds); 
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                currentQR = qr;
                botStatus = 'aguardando_qrcode';
                console.log('\nEscaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):\n');
                qrcodeTerminal.generate(qr, { small: true });
                
                // Gera um link externo com o QR Code para enviar no Telegram
                const qrUrlApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                
                const mensagemTelegram = `⚠️ *Bot requer autenticação!*\nEscaneie o QR Code acessando a rota \`/qr\` da sua API ou visualize diretamente aqui:\n${qrUrlApi}`;
                await sendTelegramMessage(mensagemTelegram, TELEGRAM_CHAT_ID);
            }
            
            if (connection === 'close') {
                botStatus = 'desconectado';
                currentQR = '';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log('Conexão fechada.', statusCode, '- Reconectando:', shouldReconnect);
                await sendTelegramMessage(`🔴 *Bot Desconectado!* StatusCode: ${statusCode}`, TELEGRAM_CHAT_ID);

                if (shouldReconnect) {
                    startBot();
                } else {
                    console.log('Sessão deslogada. Apague os dados de login e inicie novamente.');
                    await sendTelegramMessage(`❌ *Sessão Deslogada!* É necessário limpar a base e gerar um novo QR Code.`, TELEGRAM_CHAT_ID);
                }
            } else if (connection === 'open') {
                botStatus = 'conectado';
                currentQR = '';
                console.log('✅ Bot conectado ao WhatsApp com sucesso!');
                await sendTelegramMessage('✅ *Bot conectado ao WhatsApp com sucesso!*', TELEGRAM_CHAT_ID);
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
            }
        });

    } catch (erro){
        botStatus = 'erro';
        console.log('Erro: '+erro.message);
        await sendTelegramMessage(`❌ *Erro Crítico no Bot:* ${erro.message}`, TELEGRAM_CHAT_ID);
    }
}

const app = express();
app.use(express.json());

// 1. Rota Health Check (Sempre retorna 200)
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'online', 
        bot_status: botStatus 
    });
});

// 2. Rota para iniciar o bot
app.get('/start', (req, res) => {
    if (botStatus === 'conectado' || botStatus === 'iniciando') {
        return res.status(400).json({ 
            erro: 'O bot já está em execução ou tentando conectar.', 
            status: botStatus 
        });
    }
    
    startBot().catch(err => console.error(err));
    res.status(200).json({ mensagem: 'Processo de inicialização do bot foi acionado.' });
});

// 3. Rota para exibir o QR Code no navegador
app.get('/qr', async (req, res) => {
    if (botStatus === 'conectado') {
        return res.status(200).send('<h2>O bot já está conectado!</h2>');
    }
    if (!currentQR) {
        return res.status(200).send('<h2>Nenhum QR Code disponível. O bot pode estar offline ou iniciando. Chame a rota /start.</h2>');
    }
    
    try {
        // Converte o código bruto em uma imagem para exibir em HTML
        const qrImage = await qrcodeImg.toDataURL(currentQR);
        res.status(200).send(`
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; font-family:sans-serif;">
                <h2>Escaneie o QR Code para conectar</h2>
                <img src="${qrImage}" alt="QR Code WhatsApp" style="width: 300px; height: 300px;" />
                <p>Status atual: ${botStatus}</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Erro ao renderizar o QR Code.');
    }
});

// Inicialização do Servidor Web
app.listen(PORT, () => {
    console.log(`🌐 WebService rodando na porta ${PORT}`);
    console.log(`👉 Health Check: http://localhost:${PORT}/`);
    console.log(`👉 Iniciar Bot:  http://localhost:${PORT}/start`);
    console.log(`👉 Ver QR Code:  http://localhost:${PORT}/qr`);
});