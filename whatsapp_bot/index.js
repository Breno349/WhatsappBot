// index.js
import { Bot } from "./bot.js";
import { registrarListenersPadrao } from "./tools/listeners.js";
import http from "http";

registrarListenersPadrao();

const PORT = process.env.PORT ?? 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state: Bot.sock !== null }));
}).listen(PORT, () => {
    console.log(`\x1b[34mHTTP:\x1b[0m Executing in ${PORT}`);
});

await Bot.start()