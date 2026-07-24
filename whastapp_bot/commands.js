const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const console = require('console');
const { baixarAudio, baixarVideo, QUALIDADES, listarQualidades, obterInfoVideo, formatarDuracao } = require('./tools_bot/youtube_download.js')
const fs = require('fs');
const { adicionar, remover, obter, listar } = require('./tools_bot/listaUsuarios.js');

const USUARIOS = listar();

const MENU_INFO = [
    {
        nome: '.ping', desc: 'Responder com pong.'
    },
    {
        nome: '.piada', desc: 'Uma piada aleatória. _sujeito a constrangimento.._'
    },
    {
        nome: '.ytinfo', desc: 'Buscar por informações de um *link* do youtube.'
    },
    {
        nome: '.ytaudio', desc: 'Baixar um áudio/música do youtube.'
    },
    {
        nome: '.ytvideo', desc: 'Baixar um vídeo do youtube.'
    },
    {
        nome: '.mutar', desc: 'Impedir que uma pessoa execute comandos.'
    }
]

const COMMANDS = {
    menu: async (ctx) => {
        await ctx.replyText(
            `Este é o Bot do ${process.env.USER_NAME}\nAqui estão os comandos:\n\n${MENU_INFO.map(cmd => `Nome: *${cmd.nome}*\nDescrição: _${cmd.desc}_\n\n`)}`
        )
    },
    ping: async (ctx) => await ctx.replyText('pong 🏓'),
    piada: async (ctx) => {
        const resp = await fetch('https://v2.jokeapi.dev/joke/Any?lang=pt');
        const data = await resp.json();
        await ctx.replyText(data.joke ?? data.setup + '\n' + data.delivery);
    },
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
            caminho = await baixarVideo(url, qualidade); // se undefined, usa 'media' por padrão
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
    dog: async (ctx) => await ctx.replySticker('dog_shil'),
    mutar: async (ctx) => {
        adicionar(ctx.senderJid,0,"Bicho besta demais.")
        await ctx.replyText('Mutado.')
        await ctx.replySticker('dog_shil')
    }
};

module.exports = {
    COMMANDS
}