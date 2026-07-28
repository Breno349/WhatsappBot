// tools/listeners.js
import { Bot } from "../bot.js";
import { sendTelegramMessage, escapeHtml } from "./telegram.js";

export function registrarListenersPadrao() {
    Bot.event.on("connecting", ({state,statusCode,reason}) => {
        console.log({state,statusCode,reason})
        if (state === 'connected') {
            sendTelegramMessage('✅ Bot conectado ao WhatsApp com sucesso.');
        } else if (state === 'restarted' || state === 'closed') {
            sendTelegramMessage(`⚠️ Conexão encerrada — motivo: <b>${escapeHtml(reason ?? statusCode ?? 'desconhecido')}</b>`);
        }
    })

    Bot.event.on("login", ({from,code}) => {
        console.log({from,code})
        sendTelegramMessage(`🔑 Novo ${from === 'code' ? 'código de pareamento' : 'QR code'} gerado:\n<code>${escapeHtml(code)}</code>`);
    })

    Bot.event.on("error", ({from, message}) => {
        console.log({from, message})
        sendTelegramMessage(`🚨 Erro (${escapeHtml(from)}): ${escapeHtml(message)}`);
    })
}