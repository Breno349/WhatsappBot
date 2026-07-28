import { Bot } from "./bot.js";
import http from "http";

Bot.event.on("connecting", ({state,statusCode,reason,sock}) => {
    const data = {state,statusCode,reason};
    console.log( data );
});

Bot.event.on("login", ({from,code}) => {
    const data = {from,code};
    console.log( data );
});

Bot.event.on("error", ({from, info}) => {
    const data = {from, info};
    console.log( data );
});

// Criação do servidor WebService utilizando o módulo nativo HTTP
const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
            status: "ok", 
            botConnected: Bot.sock !== null 
        }));
    } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WebService rodando na porta ${PORT}`);
});

// Inicializa o bot de forma assíncrona em segundo plano sem bloquear a porta do servidor
Bot.start().catch((err) => {
    console.error("Erro ao iniciar o bot:", err);
});
