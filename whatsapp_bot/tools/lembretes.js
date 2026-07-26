// lembretes.js
import { pool } from './db.js';

let tabelaGarantida = false;
async function init() {
  if (tabelaGarantida) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lembretes (
      id SERIAL PRIMARY KEY,
      jid TEXT NOT NULL,
      remote_jid TEXT NOT NULL,
      texto TEXT NOT NULL,
      disparar_em TIMESTAMPTZ NOT NULL,
      enviado BOOLEAN NOT NULL DEFAULT false,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      criado_por_nome TEXT,
      para_outra_pessoa BOOLEAN NOT NULL DEFAULT false
    );
  `);
  tabelaGarantida = true;
}

export async function apagarLembrete(id) {
  await pool.query(`DELETE FROM lembretes WHERE id = $1`, [id]);
}

export async function criarLembrete(jid, remoteJid, texto, dispararEm, criadoPorNome, paraOutraPessoa = false) {
  await init();
  const { rows } = await pool.query(
    `INSERT INTO lembretes (jid, remote_jid, texto, disparar_em, criado_por_nome, para_outra_pessoa)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [jid, remoteJid, texto, dispararEm, criadoPorNome, paraOutraPessoa]
  );
  return rows[0].id;
}

export async function buscarPendentesVencidos() {
  await init();
  const { rows } = await pool.query(
    `SELECT * FROM lembretes WHERE enviado = false AND disparar_em <= now()`
  );
  return rows;
}

export async function listarPendentesDoUsuario(jid) {
  await init();
  const { rows } = await pool.query(
    `SELECT * FROM lembretes WHERE jid = $1 AND enviado = false ORDER BY disparar_em ASC`,
    [jid]
  );
  return rows;
}

export async function cancelarLembrete(id, jid) {
  const { rowCount } = await pool.query(
    `DELETE FROM lembretes WHERE id = $1 AND jid = $2`,
    [id, jid]
  );
  return rowCount > 0; // true se de fato apagou algo (e era desse usuário)
}