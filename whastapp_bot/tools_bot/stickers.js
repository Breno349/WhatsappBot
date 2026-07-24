// tools_bot/stickers.js
const fs = require('fs');
const path = require('path');

const STICKERS_DIR = path.join(__dirname, '..', 'stickers');
const cache = new Map(); // nome -> Buffer, carregado uma vez só

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

module.exports = { carregarSticker };