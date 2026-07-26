import { iniciarBot, fecharBot,Bot } from './bot.js';

export let running = false;

Bot.on('status',(stt)=>{
  console.log('==> RUN: Status: '+stt)
  if(stt ==='conectado'){
    running = true;
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