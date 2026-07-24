const { YtDlp } = require('ytdlp-nodejs');
const ffmpegPath = require('ffmpeg-static');
const ytdlp = new YtDlp({ ffmpegPath });
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const fs = require('fs');

async function converterParaWhatsapp(caminhoEntrada, caminhoSaida) {
  await execFileAsync(ffmpegPath, [
    '-i', caminhoEntrada,
    '-c:v', 'libx264',       // recodifica vídeo pra H.264
    '-profile:v', 'baseline', // perfil mais compatível com players mobile
    '-level', '3.0',
    '-c:a', 'aac',            // recodifica áudio pra AAC
    '-b:a', '128k',
    '-movflags', '+faststart', // move metadados pro início do arquivo — essencial pra streaming no mobile
    '-y',                     // sobrescreve se já existir
    caminhoSaida,
  ]);

  return caminhoSaida;
}

const QUALIDADES = {
  baixa: '360p',
  media: '480p',
  alta: '1080p'
};

async function baixarAudio(url) {
  const result = await ytdlp
    .download(url)
    .filter('audioonly')   // só o áudio
    .type('mp3')
    .run();

  return result.filePaths[0]; // caminho do arquivo baixado
}

async function baixarVideo(url, qualidade = 'media') {
  const resolucoesDisponiveis = await listarQualidades(url);
  const alvo = {
    baixa: resolucoesDisponiveis.at(-1),   // a menor
    media: resolucoesDisponiveis[Math.floor(resolucoesDisponiveis.length / 2)], // a do meio
    alta: resolucoesDisponiveis[0],        // a maior
  }[qualidade] ?? resolucoesDisponiveis[0];

  const result = await ytdlp
    .download(url)
    .filter('mergevideo')
    .quality(alvo)
    .type('mp4')
    .run();

  const caminhoOriginal = result.filePaths[0];
  const caminhoConvertido = caminhoOriginal.replace('.mp4', '_whatsapp.mp4');

  await converterParaWhatsapp(caminhoOriginal, caminhoConvertido);
  fs.unlinkSync(caminhoOriginal);

  return caminhoConvertido;
}

async function listarQualidades(url) {
  const result = await ytdlp.getFormatsAsync(url);

  const resolucoes = [...new Set(
    result.formats
      .filter((f) => f.height && f.height >= 144)
      .map((f) => `${f.height}p`)
  )];

  return resolucoes.sort((a, b) => parseInt(b) - parseInt(a));
}

async function obterInfoVideo(url) {
  const info = await ytdlp.getInfoAsync(url);
  return {
    titulo: info.title,
    duracaoSegundos: info.duration,
    thumbnailUrl: info.thumbnail,
    canal: info.uploader
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