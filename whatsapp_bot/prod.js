import { Bot } from "./bot.js";
import express from "express";

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

const server = express()

server.get('/',(req,res) => {
    res.status(200).send(JSON.stringify({
        state: Bot.sock !== null
    })).end()
})

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
    console.log(`WebService rodando na porta ${PORT}`);
});

Bot.start().catch((err) => {
    console.error("Erro ao iniciar o bot:", err);
});
