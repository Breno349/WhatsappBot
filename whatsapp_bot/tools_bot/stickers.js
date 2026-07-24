const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const ffmpegPath = require('ffmpeg-static');

const STICKERS_DIR = path.join(__dirname, '..', 'stickers');
const cache = new Map(); // nome -> Buffer, carregado uma vez só

async function converterImagemEmFigurinha(entradaOuBuffer) {
  const saida = path.join(os.tmpdir(), `sticker-out-${Date.now()}.webp`);
  let entrada;
  let precisaApagarEntrada = false;

  if (Buffer.isBuffer(entradaOuBuffer)) {
    entrada = path.join(os.tmpdir(), `sticker-in-${Date.now()}.png`);
    fs.writeFileSync(entrada, entradaOuBuffer);
    precisaApagarEntrada = true;
  } else if (typeof entradaOuBuffer === 'string' && fs.existsSync(entradaOuBuffer)) {
    entrada = entradaOuBuffer; // já é um caminho de arquivo válido — usa direto
  } else {
    throw new Error('Entrada inválida: nem Buffer nem caminho de arquivo existente');
  }

  try {
    await execFileAsync(ffmpegPath, [
      '-i', entrada,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      '-c:v', 'libwebp',
      '-y',
      saida,
    ]);
    return fs.readFileSync(saida);
  } finally {
    if (precisaApagarEntrada && fs.existsSync(entrada)) fs.unlinkSync(entrada);
    if (fs.existsSync(saida)) fs.unlinkSync(saida);
  }
}

function carregarSticker(nome) {
  if (cache.has(nome)) return cache.get(nome); // já leu antes, reaproveita

  const caminho = path.join(STICKERS_DIR, `${nome}.webp`);
  if (!fs.existsSync(caminho)) {
    throw new Error(`Figurinha "${nome}" não encontrada em ${caminho}`);
  }

  const buffer = fs.readFileSync(caminho);
  cache.set(nome, buffer);
  return buffer;
}

module.exports = { carregarSticker,converterImagemEmFigurinha };