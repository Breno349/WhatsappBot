const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const ffmpegPath = require('ffmpeg-static');

// youtubei.js é um pacote ESM puro — não dá pra usar require() nele.
// import() dinâmico funciona dentro de um arquivo CommonJS normalmente.
let ytPromise = null;
async function getYt() {
  if (!ytPromise) {
    const { Innertube, UniversalCache } = await import('youtubei.js');
    ytPromise = Innertube.create({ cache: new UniversalCache(false) });
  }
  return ytPromise;
}

function extrairVideoId(url) {
  const match = url.match(/(?:v=|\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error('Link do YouTube inválido');
  return match[1];
}

// Salva um ReadableStream (Web Streams API) do youtubei.js em disco
async function salvarStream(webStream, caminho) {
  const nodeStream = Readable.fromWeb(webStream);
  const writeStream = fs.createWriteStream(caminho);

  await new Promise((resolve, reject) => {
    nodeStream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    nodeStream.on('error', reject);
  });

  return caminho;
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
  const yt = await getYt();
  const videoId = extrairVideoId(url);

  const stream = await yt.download(videoId, {
    type: 'audio',
    format: 'mp4', // sai como .m4a (AAC) — já compatível com audio/mp4 do WhatsApp
    quality: 'best',
  });

  const caminho = path.join(os.tmpdir(), `${videoId}-audio.m4a`);
  await salvarStream(stream, caminho);
  return caminho;
}

async function baixarVideo(url, ctx, qualidade = 'media') {
  const yt = await getYt();
  const videoId = extrairVideoId(url);
  const resolucao = QUALIDADES[qualidade] ?? QUALIDADES.media;

  const stream = await yt.download(videoId, {
    type: 'video+audio', // o youtubei.js já faz a junção internamente
    format: 'mp4',
    quality: resolucao,
  });

  const caminhoOriginal = path.join(os.tmpdir(), `${videoId}-original.mp4`);
  await salvarStream(stream, caminhoOriginal);

  const caminhoConvertido = path.join(os.tmpdir(), `${videoId}-whatsapp.mp4`);
  await ctx.replyText('⏳ Convertendo vídeo..');
  await converterParaWhatsapp(caminhoOriginal, caminhoConvertido);
  fs.unlinkSync(caminhoOriginal);

  return caminhoConvertido;
}

async function listarQualidades(url) {
  const yt = await getYt();
  const videoId = extrairVideoId(url);
  const info = await yt.getBasicInfo(videoId);

  const todosFormatos = [
    ...(info.streaming_data?.formats ?? []),
    ...(info.streaming_data?.adaptive_formats ?? []),
  ];

  const resolucoes = [...new Set(
    todosFormatos
      .filter((f) => f.has_video && f.height && f.height >= 144)
      .map((f) => `${f.height}p`)
  )];

  const ordenado = resolucoes.sort((a, b) => parseInt(b) - parseInt(a));
  return ordenado.length > 0 ? ordenado : ['360p'];
}

async function obterInfoVideo(url) {
  const yt = await getYt();
  const videoId = extrairVideoId(url);
  const info = await yt.getBasicInfo(videoId);
  const basic = info.basic_info;

  return {
    titulo: basic.title,
    duracaoSegundos: basic.duration,
    thumbnailUrl: basic.thumbnail?.[0]?.url,
    canal: basic.channel?.name ?? basic.author,
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
