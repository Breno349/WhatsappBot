import { pool } from "./db.js";

const NOME_TABELA = 'baileys_lembrete';

let tabelaGarantida = false;
async function init() {
  if (tabelaGarantida) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${NOME_TABELA}" (
      id SERIAL PRIMARY KEY,
      de TEXT NOT NULL,
      para TEXT NOT NULL,
      gatilho TIMESTAMP NOT NULL,
      texto TEXT NOT NULL,
      enviado BOOLEAN DEFAULT FALSE
    );
  `);
  tabelaGarantida = true;
}

export async function adicionarLembrete(de,para,quando,texto){
    await init();
    const {rows} = await pool.query(
        `INSERT INTO "${NOME_TABELA}" (de,para,gatilho,texto,enviado)
        VALUES ($1,$2,$3,$4,$5) 
        RETURNING id`,
        [String(de),String(para),quando,String(texto),false]
    );
    const id = rows[0]?.id; 
    const tempo = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return {
        id, 
        tempo
    };
}

export async function removerLembrete(id,todos=false){
    await init()
    const query = todos?
        `DELETE FROM "${NOME_TABELA}";` :
        `DELETE FROM "${NOME_TABELA}" WHERE id = $1`;
    const params = todos? [] : [id]
    const result = await pool.query(query,params)
    return result && result.rowCount > 0
}

export async function listarLembrete(de,pendentes=false){
    await init()
    const query = pendentes?
        `SELECT * FROM "${NOME_TABELA}" WHERE enviado = $1` :
        `SELECT * FROM "${NOME_TABELA}" WHERE de = $1`;
    const params = pendentes?
        [false] :
        [String(de)];
    const {rows} = await pool.query(query,params)
    return rows ?? []
}