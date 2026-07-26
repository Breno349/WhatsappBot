import { Pool } from 'pg';

export const pool = new Pool({
    user: process.env.DB_USER,          // Usuário do banco de dados
    host: process.env.DB_HOST,          // Endereço do servidor (ex: localhost ou IP)
    database: process.env.DB_NAME,      // Nome do banco de dados
    password: process.env.DB_PASSWORD,  // Senha do usuário
    port: process.env.DB_PORT || 5432,  // Porta (o padrão do Postgres é 5432)
});