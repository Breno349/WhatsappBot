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
import { adicionarLembrete, listarLembrete, removerLembrete } from "./lembretes.js";
import { convertToFigura, convertToFiguraAnim, removerArquivo } from "./stickers.js";
import { adicionar, remover, isMuted } from "./usuarios.js";
import { formatarData } from "./utils.js";

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
            return;
        };
        const tipo = ctx.quotedTipo;
        if(tipo == 'imageMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                await ctx.responderImage( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar imagem')
            }
        } else if(tipo == 'videoMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                await ctx.responderVideo( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar video')
            }
        }
    },
    verpv: async (ctx) => {
        if(!ctx.isBot){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        if(!ctx.isQuoted || !ctx.isView){
            return;
        };
        if(ctx.args.length>0) await ctx.editarTexto(ctx.args.join(" "))
        const tipo = ctx.quotedTipo;
        if(tipo == 'imageMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){
                await ctx.privadoImage( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar imagem')
            }
        } else if(tipo == 'videoMessage'){
            const legenda = ctx.quoted[tipo].caption ?? ''
            const caminho = await ctx.baixar(true)
            if(caminho){       
                await ctx.privadoVideo( caminho,legenda )
                await remover(caminho)
            } else {
                console.log('VER: Erro ao baixar video')
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
    },

    addnota: async (ctx) => {
        if(!ctx.isBot || ctx.isGrupo){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        // show é o bot e é no privado
        const quando = formatarData((ctx.args[0] ?? null))
        if(quando){
            const para = (ctx.args[1] ?? null)
            if(!para){
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
                return;
            }
            if(/^(\(?\d{2}\)?\s?)?(9\d{4}-?\d{4})$/.test(para) && ctx.args[2]){
                const para_jid = `55${para}@s.whatsapp.net`
                const [result] = await ctx.verificarPessoa(para_jid)
                if(result && result.exists){
                    const texto = ctx.args.slice(2).join(' ')
                    const {id,tempo} = await adicionarLembrete(ctx.msg.key.remoteJid,para_jid,quando,texto)
                    if(id){
                        if(ctx.config.autoreact) await ctx.responderReact( '⏰' )
                        await ctx.responderTexto(`Lembrete [#${id}] (${tempo})\n> ${texto}`)
                    } else {
                        if(ctx.config.autoreact) await ctx.responderReact( '⚠️' )        
                    }
                } else {
                    if(ctx.config.autoreact) await ctx.responderReact( '🤷‍♂️' )
                }
            } else if(ctx.args[1]){
                const texto = ctx.args.slice(1).join(' ')
                const {id,tempo} = await adicionarLembrete(ctx.msg.key.remoteJid,ctx.msg.key.remoteJid,quando,texto)
                if(id){
                    if(ctx.config.autoreact) await ctx.responderReact( '⏰' )
                    await ctx.responderTexto(`Lembrete [#${id}] (${tempo})\n> ${texto}`)
                } else {
                    if(ctx.config.autoreact) await ctx.responderReact( '⚠️' )        
                }
            } else {
                if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            }
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
        }
    },
    remnota: async (ctx) => {
        if(!ctx.isBot || ctx.isGrupo){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        // show é o bot e é no privado
        const id = ctx.args[0] ?? null
        if(!id){
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return
        }
        if(/^\d+$/.test(id)){
            const apagado = await removerLembrete( id )
            if(apagado){
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            } else {
                if(ctx.config.autoreact) await ctx.responderReact( '🤷‍♂️' )
            }
        } else if(id === 'all'){
            const apagado = await removerLembrete( id, true )
            if(apagado){
                if(ctx.config.autoreact) await ctx.responderReact( '👍' )
            } else {
                if(ctx.config.autoreact) await ctx.responderReact( '🤷‍♂️' )
            }
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '👎' )
            return
        }
    },
    notas: async (ctx) => {
        if(!ctx.isBot || ctx.isGrupo){
            if(ctx.config.autoreact) await ctx.responderReact( '🚫' )
            return;
        }
        // show é o bot e é no privado
        const notas = await listarLembrete( ctx.msg.key.remoteJid )
        const validas = notas.filter(item => !item.enviado).map(item => `#[${item.id}] ${(item.de===item.para)? '_(min)_' : '_(outro)_'} (${item.gatilho.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})\n> ${item.texto}\n`)
        if(validas.length > 0){
            await ctx.responderTexto(`⏰ Lembretes:\n\n${validas.join('\n')}`)
        } else {
            if(ctx.config.autoreact) await ctx.responderReact( '🤷‍♂️' )
        }
    },
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
