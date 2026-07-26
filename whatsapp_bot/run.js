import { iniciarBot, fecharBot,Bot } from './bot.js';
import { sendTelegramMessage } from './tools/telegram.js'

export let running = false;
let avisado = false;

Bot.on('status',async (stt)=>{
  console.log('==> RUN: Status: '+stt)
  if(stt ==='conectado'){
    running = true;
    if(!avisado){
      await sendTelegramMessage("✔️ Bot Conectado",process.env.TELEGRAM_CHATID)
      avisado = true;
    }
  } else if(stt === 'deslogado'){
    if(!avisado && running){
      await sendTelegramMessage("⛔️ Bot Desconectado",process.env.TELEGRAM_CHATID)
      avisado = true;
    }
    running = false;
  } else {
    running = false;
  }
})
Bot.on('code',(code)=>{
  console.log('==> RUN: Code: ['+code+']')
  running = false;
})
Bot.on('qrcode',(qrcode)=>{
  console.log('==> RUN: QRCode:\n'+qrcode)
  running = false;
})
Bot.on('erro',(err)=>{
  console.log('==> RUN: Erro: '+err)
  running = false;
})
Bot.on('fail',(err)=>{
  console.log('==> RUN: Fail: '+err)
  running = false;
})

export async function init(){
  running = false;
  await iniciarBot()
}
