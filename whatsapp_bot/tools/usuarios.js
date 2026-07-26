import { pool } from './db.js';

const NOME_TABELA = 'baileys_usuarios';

let tabelaGarantida = false;
async function init() {
  if (tabelaGarantida) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${NOME_TABELA}" (
      jid TEXT PRIMARY KEY,
      tipo TEXT NOT NULL
    );
  `);
  tabelaGarantida = true;
}

export async function adicionar(jid, tipo) {
  await init();
  await pool.query(
    `INSERT INTO "${NOME_TABELA}" (jid,tipo)
     VALUES ($1,$2)
     ON CONFLICT (jid) DO UPDATE SET tipo = $2`,
    [jid, tipo]
  );
}

export async function remover(jid) {
  await init();
  await pool.query(`DELETE FROM "${NOME_TABELA}" WHERE jid = $1`, [jid]);
}

export async function alterar(jid, tipo) {
  await init();
  await pool.query(`UPDATE "${NOME_TABELA}" SET tipo = $2 WHERE jid = $1`, [jid, tipo]);
}

export async function obter(jid) {
  await init();
  const { rows } = await pool.query(`SELECT * FROM "${NOME_TABELA}" WHERE jid = $1`, [jid]);
  return rows[0] ?? null;
}

export async function verificar(jid) {
    const res = await obter(jid)
    return res !== null
}

export async function isMuted(jid) {
    const res = await obter(jid)
    if(res){
      return Boolean(res.tipo == 'mute')
    } else {
      return false;
    }
}

export async function listar() {
  await init();
  const { rows } = await pool.query(`SELECT * FROM "${NOME_TABELA}"`);
  return rows;
}