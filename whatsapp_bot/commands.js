const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const console = require('console');
//const { baixarAudio, baixarVideo, QUALIDADES, listarQualidades, obterInfoVideo, formatarDuracao } = require('./tools_bot/youtube_download_youtubeijs')
const fs = require('fs');
const { adicionar,remover,obter } = require('./tools_bot/listaUsuarios.js');
const { configDotenv } = require('dotenv');
const { carregarSticker, converterImagemEmFigurinha } = require('./tools_bot/stickers.js');

const MENU_INFO = [
    {
        nome: '.ping', desc: 'Responder com pong.'
    },
    {
        nome: '.piada', desc: 'Uma piada aleatória *sujeito a constrangimento*'
    },
    /*
    {
        nome: '.ytinfo', desc: 'Buscar por informações de um *link* do youtube.'
    },
    {
        nome: '.ytaudio', desc: 'Baixar um áudio/música do youtube.'
    },
    {
        nome: '.ytvideo', desc: 'Baixar um vídeo do youtube.'
    },*/
    {
        nome: '.mutar', desc: 'Impedir que uma pessoa execute comandos.', onlyOwner: true
    },
    {
        nome: '.desmutar', desc: 'Desmutar a pessoa', onlyOwner: true
    },
    {
        nome: '.revelar', desc: 'Revelar imagem/video de visualização unica', onlyOwner: true
    },
    {
        nome: '.dog', desc: 'Mandar fig do cachorro'
    },
    {
        nome: '.fig', desc: 'Converter imagem em figurinha.'
    }
]

const COMMANDS = {
    menu: async (ctx) => {
        const list_cmds = MENU_INFO.map( cmd => {
                return `🤖 *${cmd.nome}* ${cmd.onlyOwner? '\`\`\`(admin)\`\`\`' : ''}\nℹ️ _${cmd.desc}_\n`
            }
        ).join('');
        await ctx.replyText(
            `👋 Este é o Bot do ${process.env.USER_NAME}\n📢 Aqui estão os comandos:\n\n${list_cmds}`
        )
    },
    ping: async (ctx) => {
        const timeMSG = (ctx.msg.messageTimestamp);
        const timeCRR = (Date.now());
        let delay = '--';
        if(timeCRR && timeMSG){
            const ms = timeCRR - (timeMSG * 1000);
            delay = String(ms);
        }
        await ctx.replyText('pong 🏓 _'+delay+'ms_')
    },
    piada: async (ctx) => {
        const resp = await fetch('https://v2.jokeapi.dev/joke/Any?lang=pt');
        const data = await resp.json();
        await ctx.replyText(data.joke ?? data.setup + '\n' + data.delivery);
    },
    /*
    ytaudio: async (ctx) => {
        const url = ctx.args[0];
        if (!url) {
        await ctx.replyText('📢 Manda assim: _.musica <link do youtube>_');
        return;
        }
        await ctx.replyText('⏳ Baixando, aguenta aí...');
        let caminho;
        try {
        caminho = await baixarAudio(url);
        const buffer = fs.readFileSync(caminho);
        await ctx.replyAudio(buffer);
        } catch (erro) {
        console.log('Erro ao baixar música:', erro.message);
        await ctx.replyText('> 😕 Não consegui baixar esse áudio');
        } finally {
        if (caminho && fs.existsSync(caminho)) {
            fs.unlinkSync(caminho); // limpa o arquivo temporário do disco
        }
        }
    },
    ytvideo: async (ctx) => {
        const url = ctx.args[0];
        const qualidade = ctx.args[1]?.toLowerCase(); // segundo argumento, se existir
        if (!url) {
            await ctx.replyText(`📢 Manda assim: _.video <link> [${Object.keys(QUALIDADES).join('|')}]_`);
            return;
        }
        if (qualidade && !QUALIDADES[qualidade]) {
            await ctx.replyText(`> ⚠️ Qualidade inválida. Use: ${Object.keys(QUALIDADES).join(', ')}`);
            return;
        }
        await ctx.replyText('⏳ Baixando vídeo, aguenta aí...');
        let caminho;
        try {
            caminho = await baixarVideo(url, ctx, qualidade); // se undefined, usa 'media' por padrão
            const buffer = fs.readFileSync(caminho);
            await ctx.replyVideo(buffer);
        } catch (erro) {
            console.log('Erro ao baixar vídeo:', erro.message);
            await ctx.replyText('> 😕 Não consegui baixar esse vídeo\nRecomendo: _.ytinfo <link>_');
        } finally {
            if (caminho && fs.existsSync(caminho)) fs.unlinkSync(caminho);
        }
    },
    ytinfo: async (ctx) => {
        const url = ctx.args[0];
        if (!url) {
            await ctx.replyText('📢 Manda assim: _.ytinfo <link do youtube>_');
            return;
        }
        try {
            const [info, resolucoes] = await Promise.all([
                obterInfoVideo(url),
                listarQualidades(url),
            ]);
            const legenda =
                `*${info.titulo}*\n` +
                `📺 ${info.canal}\n` +
                `⏱️ Duração: ${formatarDuracao(info.duracaoSegundos)}\n` +
                `🎞️ Qualidades: ${resolucoes.join(', ')}`;
            const thumbResp = await fetch(info.thumbnailUrl);
            const thumbBuffer = Buffer.from(await thumbResp.arrayBuffer());
            await ctx.replyImage(thumbBuffer, legenda);
        } catch (erro) {
            console.log('Erro ao consultar vídeo:', erro.message);
            await ctx.replyText('Não consegui consultar esse link 😕');
        }
    },
    */
    dog: async (ctx) => {
        await ctx.replySticker('dog_shil')
    },
    mutar: async (ctx) => {
        if(!ctx.isOwner){
            await ctx.replySticker('dog_shil')
            return;
        }
        if(!ctx.isGroup) return;
        const contextInfo = ctx.msg.message[ctx.tipo]?.contextInfo;
        const num_jid = contextInfo?.mentionedJid?.length ?? 0
        if(num_jid == 0){
            console.log("Não marcou ninguem moço")
        } else if(num_jid == 1){
            const motivo = ctx.args.slice(1).join(' ') ?? "sem motivo" ;
            const jid = contextInfo?.mentionedJid[0];
            await adicionar(jid,false,motivo)
            await ctx.replyText('👮‍♂️ Mutado')
        }
    },
    desmutar: async (ctx) => {
        if(!ctx.isOwner){
            await ctx.replySticker('dog_shil')
            return;
        }
        if(!ctx.isGroup) return;
        const contextInfo = ctx.msg.message[ctx.tipo]?.contextInfo;
        const num_jid = contextInfo?.mentionedJid?.length ?? 0
        if(num_jid == 0){
            console.log("Não marcou ninguem moço")
        } else if(num_jid == 1){
            const jid = contextInfo?.mentionedJid[0];
            const exts = await obter( jid )
            if(exts !== null){
                await remover(jid)
                await ctx.replyText('👮‍♂️ Desmutado')
            }
        }
    },
    revelar: async (ctx) => {
        if(!ctx.isOwner){
            await ctx.replySticker('dog_shil')
            return;
        }
        if(ctx.isQuoted && ctx.quotedMessage.imageMessage){
            const res = await ctx.baixarMidia( true );
            if(res){
                const bufferDaImagem = await fs.promises.readFile(res);
                await ctx.replyImage(bufferDaImagem, 'Legenda: '+(ctx.quotedMessage.imageMessage.caption ?? ''))
            } else {
                console.log('Não deu pra revelar a mensagem')
            }
        } else if(ctx.isQuoted && ctx.quotedMessage.videoMessage){
            const res = await ctx.baixarMidia( true );
            if(res){
                const bufferDoVideo = await fs.promises.readFile(res);
                await ctx.replyVideo(bufferDoVideo, 'Legenda: '+(ctx.quotedMessage.videoMessage.caption ?? ''))
            } else {
                console.log('Não deu pra revelar a mensagem')
            }
        }
    },
    fig: async (ctx) => {
        //if(!ctx.isOwner){
        //    await ctx.replySticker('dog_shil')
        //    return;
        //}
        if(!ctx.isQuoted){
            if(ctx.tipo == 'imageMessage'){
                const bufferImagem = await ctx.baixarMidia(false);
                const bufferSticker = await converterImagemEmFigurinha(bufferImagem);
                await ctx.replyStickerBuffer(bufferSticker, ctx.mensagemCitada);
            }
            return;
        }
        if(ctx.quotedMessage.imageMessage){
            const bufferImagem = await ctx.baixarMidia(true);
            const bufferSticker = await converterImagemEmFigurinha(bufferImagem);
            await ctx.replyStickerBuffer(bufferSticker, ctx.mensagemCitada);
        }
    }
};

module.exports = {
    COMMANDS
}