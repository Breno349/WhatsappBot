import { Pool } from "pg"

export const pool = getPool()

function getPool(){
    try {
        console.log('\x1b[32m%s\x1b[0m', '<<===  Conectando banco de dados ===>>')
        const pool = new Pool({
            user: process.env.DB_USER,          // Usuário do banco de dados
            host: process.env.DB_HOST,          // Endereço do servidor (ex: localhost ou IP)
            database: process.env.DB_NAME,      // Nome do banco de dados
            password: process.env.DB_PASSWORD,  // Senha do usuário
            port: process.env.DB_PORT || 5432,  // Porta (o padrão do Postgres é 5432)
        });
        console.log('\x1b[34m%s:\x1b[0m %s', 'DB', 'Conectado')
        return pool;
    } catch (erro){
        console.log('\x1b[31m%s:\x1b[0m %s \x1b[31m%s:\x1b[0m','DB','Erro na conexão com o banco de dados',erro.message)
        process.exit(1)
    }
}