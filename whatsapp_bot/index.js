import { Bot } from "./bot.js";
import { registrarListenersPadrao } from "./tools/listeners.js";
import http from "http";

registrarListenersPadrao();

const PORT = process.env.PORT ?? 3000;
let reiniciando = false;

http.createServer(async (req, res) => {
    if (req.url === '/restart') {
        if (Bot.sock) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, message: 'Bot já está conectado — nada a reiniciar.' }));
            return;
        }

        if (reiniciando) {
            res.writeHead(202, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, message: 'Já está reiniciando, aguarde.' }));
            return;
        }

        reiniciando = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Reiniciando o bot...' }));

        try {
            await Bot.start(); // reseta a contagem de tentativas (Bot.start chama startWA(0))
        } finally {
            reiniciando = false;
        }
        return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state: Bot.sock !== null }));
}).listen(PORT, () => {
    console.log(`Escutando na porta ${PORT} (health-check)`);
});

await Bot.start()
