import { parseMessage } from "./bot.js"
import { generateAudio } from "./tools/audio.js"
import fs from 'fs';
import { deleteFile, img2fig, video2fig } from "./tools/sticker.js"
import { listAllUsers, updateUserRestrict } from "./tools/usuarios.js"

export const Commands = {
    menu: {
        handler: async (ctx, args) => {
            const file = './menu'
            const data = await fs.promises.readFile( file, 'utf-8' )
            if(data){
                await ctx.replyText( data )
            }
        }
    },
    fig: {
        conditions: [ 'is_view_only_owner' ],
        handler: async (ctx, args) => {
            const tipo = ctx.quotedType ?? ctx.msgType
            if(tipo === 'imageMessage'){
                const img = await ctx.downloadMidia( ctx.isQuoted )
                if(img){
                    const fig = await img2fig( img )
                    if(fig){
                        await ctx.replyFig( fig )
                        await deleteFile( fig )
                    }
                    await deleteFile( img )
                }
            } else if(tipo === 'videoMessage'){
                const video = await ctx.downloadMidia( ctx.isQuoted )
                if(video){
                    const fig = await video2fig( video )
                    if(fig){
                        await ctx.replyFig( fig )
                        await deleteFile( fig )
                    }
                    await deleteFile( video )
                }
            }
        },
        error: async (ctx, erro) => {
            if(erro.reason === 'condition' && erro.cond === 'is_view_only_owner'){
                await ctx.replyText('Ai não meu patrão')
            } else if(erro.reason === 'restriction'){
                await ctx.replyText( 'Você ta proibido de fazer figurinha' )
            }
        }
    },
    ping: {
        handler: async (ctx, args) => {
            console.log (args)
            const timeMSG = (ctx.m.messageTimestamp);
            const timeCRR = (Date.now());
            let delay = '-';
            if(timeCRR && timeMSG){
                const ms = timeCRR - (timeMSG * 1000);
                delay = String(ms);
            }
            await ctx.replyText('pong 🏓 _'+delay+'ms_')
        }
    },
    ver: {
        permission: 'owner',
        args: [
            {name:'vo',type:'boolean',required:false},
            {name:'hint',type:'text',required:false,infinity:true}
        ],
        conditions: ['is_quoted','is_quoted_view'],
        handler: async (ctx, args) => {
            console.log(args)
            console.log(ctx.quotedMessage)
            if(args.hint){
                await ctx.editMsg(args.hint)
            }
            const tipo = ctx.quotedType;
            const caption = ctx.quotedMessage[tipo]?.caption ?? '';
            if(tipo === 'imageMessage'){
                const midia = await ctx.downloadMidia(ctx.isQuoted)
                if(midia){
                    if(args.hint){
                        await ctx.replyImageToPrivate( midia, caption )
                    } else {
                        await ctx.replyImage( midia, caption )
                    }
                    await deleteFile(midia)
                }
            } else if(tipo === 'videoMessage'){
                const midia = await ctx.downloadMidia(ctx.isQuoted)
                if(midia){
                    if(args.hint){
                        await ctx.replyVideoToPrivate( midia, caption )
                    } else {
                        await ctx.replyVideo( midia, caption )
                    }
                    await deleteFile(midia)
                }
            }
        },
        error: async (ctx, erro) => {
            if(erro.reason === 'permission'){
                await ctx.replyText( 'Vai ficar querendo kkkkk' )
            }
        }
    },
    block: {
        permission: 'owner',
        args: [
            {name:'comando',type:'cmd',required:true}
        ],
        conditions: ['is_mentioned'],
        handler: async (ctx, args) => {
            for(const lid of ctx.mentions){
                await updateUserRestrict(lid, null, args.comando, 'add')
            }
        },
        error: async (ctx, erro) => {
            if(erro.reason === 'arg'){
                await ctx.replyText('Falta definir um comando')
            } else if(erro.reason === 'condition'){
                await ctx.replyText('Falta marcar uma pessoa')
            }
        }
    },
    unblock: {
        permission: 'owner',
        args: [
            {name:'comando',type:'cmd',required:true}
        ],
        conditions: ['is_mentioned'],
        handler: async (ctx, args) => {
            for(const lid of ctx.mentions){
                await updateUserRestrict(lid, null, args.comando, 'rem')
            }
        },
        error: async (ctx, erro) => {
            if(erro.reason === 'arg'){
                await ctx.replyText('Falta definir o comando')
            } else if(erro.reason === 'condition'){
                await ctx.replyText('Falta definir marcar uma pessoa')
            }
        }
    },
    blocklist: {
        permission: 'owner',
        handler: async (ctx, args) => {
            const users = await listAllUsers()
            const users_formated = users.map(item => {
                return `Nome: *${item.name}*\n> Restrições: ${item.restrict?.length>0? item.restrict.join(', ') : 'Nenhuma'}\n`
            })
            const txt = `Usuarios: \n\n${users_formated?.length>0 ? users_formated.join('\n') : 'nenhum'}`
            await ctx.replyText(txt)
        }
    },
    piada: {
        handler: async (ctx, args) => {
            const resp = await fetch('https://v2.jokeapi.dev/joke/Any?lang=pt');
            const data = await resp.json();
            await ctx.replyText(`${data.joke ?? data.setup}\n> ${data.delivery}`)
        }
    },
    audio: {
        args: [
            {name:'phone',type:'phone_number',required:false},
            {name:'fala',type:'text',required:true,infinity:true}
        ],
        handler: async (ctx, args) => {
            const audio = await generateAudio( args.fala )
            if(audio){
                if(args.phone){
                    const [user] = await ctx.getLid( `55${args.phone}@s.whatsapp.net` )
                    if(user.exists == true && user.lid !== null){
                        await ctx.replyAudioTo( user.lid, audio, true )
                    }
                } else {
                    await ctx.replyAudio( audio, true )
                }
                await deleteFile(audio)
            }
        }
    }
    // ban user
    // unban user
    // promote user
    // umpromoter user
}
