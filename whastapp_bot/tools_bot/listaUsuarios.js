// tools_bot/listaUsuarios.js
const { Pool } = require('pg');
//const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const pool = new Pool({
            host: String(process.env.DB_HOST),
            user: String(process.env.DB_USERNAME),
            password: String(process.env.DB_PASSWORD),
            database: String(process.env.DB_NAME),
            port: process.env.DB_PORT,
            ssl: false
});

async function marcarInformado(jid) {
  await pool.query('UPDATE usuarios_lista SET informado = true WHERE jid = $1', [jid]);
}

async function adicionar(jid, nivel, motivo) {
  // Converte para número inteiro. Se for "false", null ou inválido, vira 0 (ou o nível padrão que preferir)
  const nivelValido = (nivel === 'false' || !nivel) ? 0 : parseInt(nivel, 10);

  await pool.query(
    `INSERT INTO usuarios_lista (jid, nivel, motivo, informado)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (jid) DO UPDATE SET nivel = $2, motivo = $3`,
    [jid, nivelValido, motivo] // Usando a variável corrigida aqui
  );
}

async function remover(jid) {
  await pool.query('DELETE FROM usuarios_lista WHERE jid = $1', [jid]);
}

async function obter(jid) {
  const { rows } = await pool.query('SELECT * FROM usuarios_lista WHERE jid = $1', [jid]);
  return rows[0] ?? null;
}

async function marcarInformado(jid) {
  await pool.query('UPDATE usuarios_lista SET informado = true WHERE jid = $1', [jid]);
}

async function listar() {
  const { rows } = await pool.query('SELECT * FROM usuarios_lista');
  return rows;
}

module.exports = { adicionar, remover, obter, marcarInformado, listar };
