// tools_bot/listaUsuarios.js
const fs = require('fs');
const path = require('path');

//173263326056701@lid

const ARQUIVO = path.join(__dirname, '..', 'data', 'usuarios.json');

function carregar() {
  if (!fs.existsSync(ARQUIVO)) return {};
  return JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
}

function salvar(dados) {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

function adicionar(jid, informado, motivo) {
  const dados = carregar();
  dados[jid] = { informado, motivo, criadoEm: new Date().toISOString() };
  salvar(dados);
}

function remover(jid) {
  const dados = carregar();
  delete dados[jid];
  salvar(dados);
}

function obter(jid) {
  const dados = carregar();
  return dados[jid] ?? null;
}

function listar() {
  return carregar();
}

module.exports = { adicionar, remover, obter, listar };