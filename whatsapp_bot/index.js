import { Bot } from "./bot.js";

Bot.event.on("connecting", ({state,statusCode,reason,sock}) => {
    const data = {state,statusCode,reason};
    console.log( data )
})
Bot.event.on("login", ({from,code}) => {
    const data = {from,code}
    console.log( data )
})
Bot.event.on("error", ({from, info}) => {
    const data = {from, info}
    console.log( data )
})

await Bot.start()

