// tools_bot/pgAuthState.js
const { Pool } = require('pg');
const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');

const pool = new Pool({
            host: String(process.env.DB_HOST),
            user: String(process.env.DB_USERNAME),
            password: String(process.env.DB_PASSWORD),
            database: String(process.env.DB_NAME),
            port: process.env.DB_PORT
});


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
  const texto = JSON.stringify(valor, BufferJSON.replacer); // fica como STRING, não volta pra objeto
  await pool.query(
    `INSERT INTO baileys_auth (session_id, chave, valor) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (session_id, chave) DO UPDATE SET valor = $3::jsonb`,
    [sessionId, chave, texto]
  );
}

async function usePostgresAuthState(sessionId = 'main') {
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

module.exports = { usePostgresAuthState };