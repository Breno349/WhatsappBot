const { YtDlp } = require('ytdlp-nodejs');
const ffmpegPath = require('ffmpeg-static');
const ytdlp = new YtDlp({ ffmpegPath });
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const fs = require('fs');
const path = require('path'); // <--- Adicione esta linha no topo

async function converterParaWhatsapp(caminhoEntrada, caminhoSaida) {
  await execFileAsync(ffmpegPath, [
    '-i', caminhoEntrada,
    '-c:v', 'libx264',       // recodifica vídeo pra H.264
    '-profile:v', 'baseline', // perfil mais compatível com players mobile
    '-preset', 'ultrafast',   // <--- MÁGICA DA VELOCIDADE: Codificação super rápida
    '-threads', '0',          // <--- Usa todos os núcleos do processador
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
  const caminhoCookies = path.join(__dirname, 'cookies.txt');
  const result = await ytdlp
    .download(url)
    .args(['--cookies-from-browser', 'chrome'])
    .filter('audioonly')   // só o áudio
    .type('mp3')
    .run(['--cookies', caminhoCookies]);

  return result.filePaths[0]; // caminho do arquivo baixado
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

  console.log(regraQualidade)

  const caminhoCookies = path.join(__dirname, 'cookies.txt');
  const result = await ytdlp
    .download(url)
    .quality(regraQualidade)
    .type('mp4')
    .run(['--cookies', caminhoCookies]);

  const caminhoOriginal = result.filePaths[0];

  // ---------------------------------------------------------
  // CORREÇÃO: Usando o módulo 'path' para garantir a troca de nome
  // ---------------------------------------------------------
  const parsedPath = path.parse(caminhoOriginal);
  // Pega a pasta original + nome do arquivo sem extensão + adiciona '_whatsapp.mp4'
  const caminhoConvertido = path.join(parsedPath.dir, `${parsedPath.name}_whatsapp.mp4`);
  // ---------------------------------------------------------

  await ctx.replyText('⏳ Convertendo vídeo..');
  
  await converterParaWhatsapp(caminhoOriginal, caminhoConvertido);
  
  fs.unlinkSync(caminhoOriginal);

  return caminhoConvertido;
}

async function listarQualidades(url) {
  // OBS: Adicione aqui a questão dos cookies que vimos antes, se necessário!
  const result = await ytdlp.getFormatsAsync(url);

  const resolucoes = [...new Set(
    result.formats
      .filter((f) => {
        // 1. Tem que ter altura (height) e ser maior ou igual a 144
        const temAlturaValida = f.height && f.height >= 144;
        
        // 2. Garante que é um vídeo real (ignora áudio puro ou lixo)
        const temCodecVideo = f.vcodec && f.vcodec !== 'none';
        
        // 3. Rejeita especificamente os storyboards do YouTube
        const naoEhStoryboard = !(f.format_note || '').toLowerCase().includes('storyboard');
        const naoEhSb0 = f.vcodec !== 'sb0'; // Outra forma que os storyboards aparecem

        return temAlturaValida && temCodecVideo && naoEhStoryboard && naoEhSb0;
      })
      .map((f) => `${f.height}p`)
  )];

  // Ordena da maior para a menor (ex: ['1080p', '720p', '360p'])
  const ordenado = resolucoes.sort((a, b) => parseInt(b) - parseInt(a));

  // FALLBACK DE SEGURANÇA: 
  // Se por algum motivo o vídeo for tão estranho que o filtro zerou a lista,
  // nós forçamos '360p' para o código de download não dar erro de undefined.
  if (ordenado.length === 0) {
    return ['360p']; 
  }

  return ordenado;
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