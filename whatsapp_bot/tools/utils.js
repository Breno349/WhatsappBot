export function formatarData(stringTempo) {
  const regexValidacao = /^(\d+[dhms])+$/;
  if (!regexValidacao.test(stringTempo)) {
    return null;
  }
  const unidades = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000
  };
  const regexExtracao = /(\d+)([dhms])/g;
  let totalMilissegundos = 0;
  let match;
  while ((match = regexExtracao.exec(stringTempo)) !== null) {
    const valor = parseInt(match[1], 10);
    const unidade = match[2];
    totalMilissegundos += valor * unidades[unidade];
  }
  return new Date(Date.now() + totalMilissegundos);
}