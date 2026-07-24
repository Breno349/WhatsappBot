const { YtDlp } = require('ytdlp-nodejs');
const ffmpegPath = require('ffmpeg-static');
const ytdlp = new YtDlp({ ffmpegPath });
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const fs = require('fs');
const path = require('path');
const os = require('os');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ==========================================
// COOKIES — recria o arquivo em /tmp a partir da env var,
// já que o disco do servidor é efêmero (não sobrevive a restarts)
// ==========================================
function garantirArquivoCookies() {
  const caminho = path.join(os.tmpdir(), 'yt-cookies.txt');

  if (!process.env.YOUTUBE_COOKIES) {
    return null; // sem cookies configurados — segue sem eles
  }

  if (!fs.existsSync(caminho)) {
    fs.writeFileSync(caminho, process.env.YOUTUBE_COOKIES);
  }

  return caminho;
}

// Opções comuns de autenticação/identidade, usadas em TODA chamada ao yt-dlp
function opcoesAuth() {
  const caminhoCookies = garantirArquivoCookies();
  const opcoes = {
    rawArgs: ['--user-agent', USER_AGENT],
  };
  if (caminhoCookies) {
    opcoes.cookies = caminhoCookies;
  }
  return opcoes;
}

async function converterParaWhatsapp(caminhoEntrada, caminhoSaida) {
  await execFileAsync(ffmpegPath, [
    '-i', caminhoEntrada,
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-preset', 'ultrafast',
    '-threads', '0',
    '-level', '3.0',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    caminhoSaida,
  ]);

  return caminhoSaida;
}

const QUALIDADES = {
  baixa: '360p',
  media: '480p',
  alta: '1080p',
};

async function baixarAudio(url) {
  const { cookies, rawArgs } = opcoesAuth();

  let builder = ytdlp
    .download(url)
    .filter('audioonly')
    .type('mp3');

  if (cookies) builder = builder.cookies(cookies);
  builder = builder.addArgs(...rawArgs);

  const result = await builder.run();
  return result.filePaths[0];
}

async function baixarVideo(url, ctx, qualidade = 'media') {
  const resolucoesDisponiveis = await listarQualidades(url);
  const alvo = {
    baixa: resolucoesDisponiveis.at(-1),
    media: resolucoesDisponiveis[Math.floor(resolucoesDisponiveis.length / 2)],
    alta: resolucoesDisponiveis[0],
  }[qualidade] ?? resolucoesDisponiveis[0];

  const alturaVideo = alvo.replace('p', '');
  const regraQualidade = `bestvideo[height<=${alturaVideo}]+bestaudio/best[height<=${alturaVideo}]/best`;

  const { cookies, rawArgs } = opcoesAuth();

  let builder = ytdlp
    .download(url)
    .quality(regraQualidade)
    .type('mp4');

  if (cookies) builder = builder.cookies(cookies);
  builder = builder.addArgs(...rawArgs);

  const result = await builder.run();
  const caminhoOriginal = result.filePaths[0];

  const parsedPath = path.parse(caminhoOriginal);
  const caminhoConvertido = path.join(parsedPath.dir, `${parsedPath.name}_whatsapp.mp4`);

  await ctx.replyText('⏳ Convertendo vídeo..');
  await converterParaWhatsapp(caminhoOriginal, caminhoConvertido);
  fs.unlinkSync(caminhoOriginal);

  return caminhoConvertido;
}

async function listarQualidades(url) {
  const result = await ytdlp.getFormatsAsync(url, opcoesAuth());

  const resolucoes = [...new Set(
    result.formats
      .filter((f) => {
        const temAlturaValida = f.height && f.height >= 144;
        const temCodecVideo = f.vcodec && f.vcodec !== 'none';
        const naoEhStoryboard = !(f.format_note || '').toLowerCase().includes('storyboard');
        const naoEhSb0 = f.vcodec !== 'sb0';
        return temAlturaValida && temCodecVideo && naoEhStoryboard && naoEhSb0;
      })
      .map((f) => `${f.height}p`)
  )];

  const ordenado = resolucoes.sort((a, b) => parseInt(b) - parseInt(a));

  if (ordenado.length === 0) {
    return ['360p'];
  }

  return ordenado;
}

async function obterInfoVideo(url) {
  const info = await ytdlp.getInfoAsync(url, opcoesAuth());
  return {
    titulo: info.title,
    duracaoSegundos: info.duration,
    thumbnailUrl: info.thumbnail,
    canal: info.uploader,
  };
}

function formatarDuracao(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

module.exports = {
    baixarAudio,
    baixarVideo,
    QUALIDADES,
    listarQualidades,
    obterInfoVideo,
    formatarDuracao,
}
