// react
// if(ctx.config.autoreact) await ctx.responderReact( '👍' )
// se dono
/*
if(!ctx.isBot){
    if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
    return;
}
*/

import { delay } from "../bot.js";
import { convertToFigura, convertToFiguraAnim, removerArquivo } from "./stickers.js";
import { adicionar, remover, isMuted } from "./usuarios.js";

export const Commands = {
    menu: async (ctx) => {
        const cmds = Object.keys(Commands).map(item => `\`${ctx.config.prefixo}${item}\`${Commands[item].admin ? ' (🔒)' : ''} ${Commands[item].desc ? '_'+Commands[item].desc+'_' : ''}`)
        const opcoes = `Comandos:\n\n${cmds.join('\n')}`
        if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        await ctx.responderTexto(opcoes)
    },
    
    ver: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isQuoted || !ctx.isView){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const tipo = ctx.quotedTipo;
        if(tipo == 'imageMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                await ctx.responderImage( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar imagem')
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            }
        } else if(tipo == 'videoMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                await ctx.responderVideo( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar video')
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            }
        }
    },
    verpv: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isQuoted || !ctx.isView){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const tipo = ctx.quotedTipo;
        if(tipo == 'imageMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                //if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                if(ctx.args.length>0) await ctx.editarTexto(ctx.args.join(" "))
                await ctx.privadoImage( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar imagem')
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            }
        } else if(tipo == 'videoMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                //if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                if(ctx.args.length>0) await ctx.editarTexto(ctx.args.join(" "))           
                await ctx.privadoVideo( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar video')
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            }
        }
    },
    ping: async (ctx) => {
        const timeMSG = (ctx.msg.messageTimestamp);
        const timeCRR = (Date.now());
        let delay = '--';
        if(timeCRR && timeMSG){
            const ms = timeCRR - (timeMSG * 1000);
            delay = String(ms);
        }
        if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        await ctx.responderTexto('pong 🏓 _'+delay+'ms_')
    },
    piada: async (ctx) => {
        const resp = await fetch('https://v2.jokeapi.dev/joke/Any?lang=pt');
        const data = await resp.json();
        if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        await ctx.responderTexto(data.joke ?? data.setup + '\n' + data.delivery);
    },
    mutar: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(ctx.isGrupo){
            if(ctx.mencionados.length > 0){
                for(const jid of ctx.mencionados){
                    await adicionar(jid,'mute')
                }
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            }
        } else {
            await adicionar(ctx.jid,'mute')
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        }
    },
    desmutar: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(ctx.isGrupo){
            if(ctx.mencionados.length > 0){
                for(const jid of ctx.mencionados){
                    if( (await isMuted(jid)) ){
                        await remover(jid)
                    }
                }
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            }
        } else {
            if( (await isMuted(ctx.jid)) ){
                await remover(ctx.jid)
            }
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        }
    },
    fig: async (ctx) => {
        if(ctx.isView && !ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if( (ctx.isQuoted && ctx.quotedTipo == 'imageMessage') || (!ctx.isQuoted && ctx.tipo == 'imageMessage') ){
            const image = await ctx.baixar(ctx.isQuoted)
            if(image){
                const figure = await convertToFigura(image)
                await remover(image)
                if(figure){
                    if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                    await ctx.responderFigura(figure)
                    await remover(figure)
                } else {
                    if(ctx.config.autoreact) await ctx.responderReact( '👎' )
                    console.log('FIG: Erro ao converter em fig')
                }
            } else {
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
                    console.log('FIG: Erro ao baixar imagen')
            }
        } else if( (ctx.isQuoted && ctx.quotedTipo == 'videoMessage') || (!ctx.isQuoted && ctx.tipo == 'videoMessage') ){
            const video = await ctx.baixar(ctx.isQuoted)
            if(video){
                const figure = await convertToFiguraAnim(video)
                await remover(video)
                if(figure){
                    if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                    await ctx.responderFigura(figure)
                    await remover(figure)
                } else {
                    if(ctx.config.autoreact) await ctx.responderReact( '👎' )
                        console.log('FIG: Erro ao converter em fig')
                }
            } else {
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
                console.log('FIG: Erro ao baixar video')
            }
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
        }
    },
    setgpfoto: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isGrupo){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const info = await ctx.obterInfoGrupo()
        const restrict = info.restrict ?? false;
        const you = info.participants.find((p) => p.id === ctx.jid)
        const isAdmin = Boolean(you.admin !== null)
        if(restrict && !isAdmin){
            if(ctx.config.autoreact) await ctx.responderReact( '🔒' )
            return;
        }
        if( (ctx.isQuoted && ctx.quotedTipo == 'imageMessage') || (!ctx.isQuoted && ctx.tipo == 'imageMessage') ){
            const image = await ctx.baixar(ctx.isQuoted)
            if(image){
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
                await ctx.atualizarFotoGrupo( image )
                await removerArquivo(image)
            } else {
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            }
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
        }
    },
    setgpnome: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isGrupo){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const info = await ctx.obterInfoGrupo()
        const restrict = info.restrict ?? false;
        const you = info.participants.find((p) => p.id === ctx.jid)
        const isAdmin = Boolean(you.admin !== null)
        if(restrict && !isAdmin){
            if(ctx.config.autoreact) await ctx.responderReact( '🔒' )
            return;
        }

        if(ctx.args.length == 0){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
        } else {
            const nvnome = ctx.args.join(' ')
            await ctx.atualizarNomeGrupo(nvnome)
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        }
    },
    setgpdesc: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isGrupo){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const info = await ctx.obterInfoGrupo()
        const restrict = info.restrict ?? false;
        const you = info.participants.find((p) => p.id === ctx.jid)
        const isAdmin = Boolean(you.admin !== null)
        if(restrict && !isAdmin){
            if(ctx.config.autoreact) await ctx.responderReact( '🔒' )
            return;
        }

        if(ctx.args.length == 0){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
        } else {
            const nvnome = ctx.args.join(' ')
            await ctx.atualizarDescGrupo(nvnome)
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
        }
    },
    // buga quando adiciona mais de uma pessoa por vez
    addgp: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isGrupo || ctx.args.length == 0){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const info = await ctx.obterInfoGrupo()
        const requerAprov = info.joinApprovalMode ?? false;
        const you = info.participants.find((p) => p.id === ctx.jid)
        const isAdmin = Boolean(you.admin !== null)
        if(!isAdmin){
            if(ctx.config.autoreact) await ctx.responderReact( '🔒' )
            return;
        }

        const jids = ctx.args.map(number => `55${number}@s.whatsapp.net`)
        const jids_fora = jids
            .filter(item => {
                const resultado = info.participants.find((p) => p.phoneNumber === item)
                return !Boolean(resultado)
            })
        const jids_verificados = await Promise.all(
            jids_fora.map(async (item) => {
                const [resultado] = await ctx.verificarPessoa(item)
                return { jid: item, existe: resultado?.exists===true }
            })
        );
        const jids_reais = jids_verificados
            .filter(item => item.existe)
            .map(item => item.jid)
        if(jids_reais.length > 0){
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            for(const jid of jids_reais){
                await ctx.adiconarPessoaAoGrupo(jid,requerAprov)
            }
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
        }
    },
    remgp: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isGrupo || (ctx.mencionados.length == 0 && ctx.args.length == 0)){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return;
        };
        const info = await ctx.obterInfoGrupo()
        const you = info.participants.find((p) => p.id === ctx.jid)
        const isAdmin = Boolean(you.admin !== null)
        if(!isAdmin){
            if(ctx.config.autoreact) await ctx.responderReact( '🔒' )
            return;
        }
        if(ctx.args.length>0 && ctx.args[0] === 'all'){
            const jids = info.participants.filter(item => {
                const resultado = item;
                return resultado?.admin !== 'superadmin'
            })
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            for(const pessoa of jids){
                await ctx.removerPessoaAoGrupo(pessoa.phoneNumber)
            }
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            for(const jid of ctx.mencionados){
                await ctx.removerPessoaAoGrupo(jid)
            }
        }
    }
}



Commands.menu.desc = "Mostrar comandos"
Commands.ping.desc = "Testar delay"
Commands.verpv.desc = "Ver midia (pv)"
Commands.verpv.admin = true
Commands.ver.desc = "Ver midia"
Commands.ver.admin = true
Commands.fig.desc = "Fazer figurinha"
Commands.setgpfoto.desc = "Definir foto do grupo"
Commands.setgpfoto.admin = true
Commands.setgpdesc.desc = "Definir descrição do grupo"
Commands.setgpdesc.admin = true
Commands.setgpnome.desc = "Definir nome do grupo"
Commands.setgpnome.admin = true
Commands.addgp.desc = "Adicionar pessoa"
Commands.addgp.admin = true
Commands.remgp.desc = "Remover pessoa"
Commands.remgp.admin = true
Commands.mutar.desc = "Impedir comandos"
Commands.mutar.admin = true
Commands.desmutar.desc = "Desfazer mutar"
Commands.desmutar.admin = true
Commands.piada.desc = "Buscar piada ruinha"
