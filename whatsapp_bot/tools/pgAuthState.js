// pgAuthState.js
import { pool } from './db.js';
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

async function garantirTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS baileys_auth (
      session_id TEXT NOT NULL,
      chave TEXT NOT NULL,
      valor JSONB NOT NULL,
      PRIMARY KEY (session_id, chave)
    );
  `);
}

export async function removerLogin(sessionId = 'main') {
  console.log(sessionId)
  await pool.query(
    `DELETE FROM baileys_auth WHERE session_id = $1`, [sessionId]
  )
}

async function lerChave(sessionId, chave) {
  const { rows } = await pool.query(
    'SELECT valor FROM baileys_auth WHERE session_id = $1 AND chave = $2',
    [sessionId, chave]
  );
  if (!rows[0]) return null;
  return JSON.parse(JSON.stringify(rows[0].valor), BufferJSON.reviver);
}

async function escreverChave(sessionId, chave, valor) {
  if (valor === null) {
    await pool.query('DELETE FROM baileys_auth WHERE session_id = $1 AND chave = $2', [sessionId, chave]);
    return;
  }
  const texto = JSON.stringify(valor, BufferJSON.replacer);
  await pool.query(
    `INSERT INTO baileys_auth (session_id, chave, valor) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (session_id, chave) DO UPDATE SET valor = $3::jsonb`,
    [sessionId, chave, texto]
  );
}

export async function usePostgresAuthState(sessionId = 'main') {
  await garantirTabela();

  const credsExistentes = await lerChave(sessionId, 'creds');
  const creds = credsExistentes || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const dados = {};
          for (const id of ids) {
            const valor = await lerChave(sessionId, `${type}-${id}`);
            if (valor) dados[id] = valor;
          }
          return dados;
        },
        set: async (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              await escreverChave(sessionId, `${type}-${id}`, data[type][id]);
            }
          }
        },
      },
    },
    saveCreds: async () => {
      await escreverChave(sessionId, 'creds', creds);
    },
  };
}