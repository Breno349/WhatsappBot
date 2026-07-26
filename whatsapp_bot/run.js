import { iniciarBot, fecharBot, Bot } from './bot.js';
import { removerLogin } from './tools/pgAuthState.js';
import { sendTelegramMessage } from './tools/telegram.js'
import fs from 'fs'

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
    if(running){
      await sendTelegramMessage("⛔️ Bot Deslogado pelo WPP",process.env.TELEGRAM_CHATID)
    } else {
      if(process.env.SESSION_MODE == 'file'){
        await fs.promises.unlink( process.env.SESSION_NAME )
        //await iniciarBot()
      } else if(process.env.SESSION_MODE == 'db'){
        await removerLogin(process.env.SESSION_NAME)
        //await iniciarBot()
      }
      console.log('Removido a sessão')
      await sendTelegramMessage("🗑️ A sessão foi apagada",process.env.TELEGRAM_CHATID)
    }
    running = false;
  } else {
    running = false;
  }
})
Bot.on('code',async (code)=>{
  //console.log('==> RUN: Code: ['+code+']')
  await sendTelegramMessage(`⚠️ Bot requer código: [<tg-spoiler>${code}</tg-spoiler>]`, process.env.TELEGRAM_CHATID)
  running = false;
  avisado = false;
})
Bot.on('qrcode',async (qrcode)=>{
  //console.log('==> RUN: QRCode:\n'+qrcode)
  await sendTelegramMessage(`⚠️ Bot requer leitura do QRCode:\n${qrcode}`, process.env.TELEGRAM_CHATID)
  running = false;
  avisado = false;
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
