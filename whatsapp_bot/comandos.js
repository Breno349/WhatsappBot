import { deleteFile, img2fig } from "./tools/sticker.js"
import { listUser, modifyRestriction } from "./tools/usuarios.js"

export const Commands = {
    menu: {
        permission: ['user'],
        args: [],
        handler: async (ctx, args) => {
            await ctx.replyText( "Menu meu browther" )
        },
        error: (ctx, erro) => {}
    },
    fig: {
        permission: ['user'],
        args: [],
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
        permission: ['user'],
        args: [],
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
        },
        error: async (ctx, erro) => {
            console.log (erro)
        }
    },
    ver: {
        permission: ['owner'],
        args: [{name:'hint',type:'text',required:false,infinity:true}],
        conditions: ['is_quoted','is_quoted_view'],
        handler: async (ctx, args) => {
            if(args.hint){
                await ctx.editMsg(args.hint)
            }
            const tipo = ctx.quotedType;
            if(tipo === 'imageMessage'){
                const midia = await ctx.downloadMidia(ctx.isQuoted)
                if(midia){
                    if(args.hint){
                        await ctx.replyImageToPrivate( midia )
                    } else {
                        await ctx.replyImage( midia )
                    }
                    await deleteFile(midia)
                }
            } else if(tipo === 'videoMessage'){
                const midia = await ctx.downloadMidia(ctx.isQuoted)
                if(midia){
                    if(args.hint){
                        await ctx.replyVideoToPrivate( midia )
                    } else {
                        await ctx.replyVideo( midia )
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
        permission: ['owner'],
        args: [
            {name:'comando',type:'cmd',required:true}
        ],
        conditions: ['is_mentioned'],
        handler: async (ctx, args) => {
            for(const lid of ctx.mentions){
                await modifyRestriction( lid, args.comando, 'add' )
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
    unblock: {
        permission: ['owner'],
        args: [
            {name:'comando',type:'cmd',required:true}
        ],
        conditions: ['is_mentioned'],
        handler: async (ctx, args) => {
            for(const lid of ctx.mentions){
                await modifyRestriction( lid, args.comando, 'rem' )
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
        permission: ['owner'],
        args: [],
        handler: async (ctx, args) => {
            const users = await listUser()
            const users_formated = users.map(item => {
                return `Nome: *${item.name}*\n> Restrições: ${item.restrict?.length>0? item.restrict.join(', ') : 'Nenhuma'}\n`
            })
            const txt = `Usuarios: \n\n${users_formated?.length>0 ? users_formated.join('\n') : 'nenhum'}`
            await ctx.replyText(txt)
        },
        error: async (ctx, erro) => {}
    }
}