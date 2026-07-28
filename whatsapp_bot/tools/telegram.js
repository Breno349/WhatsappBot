// tools/telegram.js
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let avisouFaltaConfig = false;

export function escapeHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export async function sendTelegramMessage(texto, tentativa = 0) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        if (!avisouFaltaConfig) {
            console.log('\x1b[33m%s:\x1b[0m %s', 'TELEGRAM', 'TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não definidos — alertas desativados');
            avisouFaltaConfig = true;
        }
        return;
    }

    try {
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: texto,
                parse_mode: 'HTML',
            }),
        });

        if (!resp.ok) {
            throw new Error(`Telegram respondeu ${resp.status}`);
        }
    } catch (erro) {
        if (tentativa < 3) {
            await new Promise((r) => setTimeout(r, 2000 * (tentativa + 1))); // backoff crescente
            return sendTelegramMessage(texto, tentativa + 1);
        }
        console.log('\x1b[31m%s:\x1b[0m %s', 'TELEGRAM', `Falhou após 3 tentativas: ${erro.message}`);
    }
}