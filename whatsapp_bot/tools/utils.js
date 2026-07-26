export function parseTempo(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const valor = parseInt(match[1], 10);
  const unidade = match[2].toLowerCase();
  const multiplicadores = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  return valor * multiplicadores[unidade];
}

export function formatarDataBR(data, fuso = 'America/Sao_Paulo') {
  return data.toLocaleString('pt-BR', { timeZone: fuso });
}