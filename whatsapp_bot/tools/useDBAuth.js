import { pool } from "./db.js";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";

const table_name = "baileys_auth";

async function garantirTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${table_name}" (
      session_id TEXT NOT NULL,
      chave TEXT NOT NULL,
      valor JSONB NOT NULL,
      PRIMARY KEY (session_id, chave)
    );
  `);
}

export async function deletarSessaoDB(sessionId = `main`){
  try {
    const res = await pool.query(
      `DELETE FROM "${table_name}" WHERE session_id = $1`, [sessionId]
    )
    return res && res.rowCount > 0
  } catch (erro){
    console.log(`\x1b[31m%s:\x1b[0m %s', 'DB','erro ao deletar sessao ${sessionId} do banco de dados`)
    return false;
  }
}

async function lerChave(sessionId, chave) {
  const { rows } = await pool.query(
    `SELECT valor FROM "${table_name}" WHERE session_id = $1 AND chave = $2`,
    [sessionId, chave]
  );
  if (!rows[0]) return null;
  return JSON.parse(JSON.stringify(rows[0].valor), BufferJSON.reviver);
}

async function escreverChave(sessionId, chave, valor) {
  if (valor === null) {
    await pool.query(`DELETE FROM "${table_name}" WHERE session_id = $1 AND chave = $2`, [sessionId, chave]);
    return;
  }
  const texto = JSON.stringify(valor, BufferJSON.replacer);
  await pool.query(
    `INSERT INTO "${table_name}" (session_id, chave, valor) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (session_id, chave) DO UPDATE SET valor = $3::jsonb`,
    [sessionId, chave, texto]
  );
}

export async function useDBAuth(sessionId = `main`) {
  await garantirTabela();

  const credsExistentes = await lerChave(sessionId, `creds`);
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
      await escreverChave(sessionId, `creds`, creds);
    },
  };
}