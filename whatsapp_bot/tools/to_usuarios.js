import { Pool } from "pg";

// Removido o 'await' antes de 'new' e corrigido para 'connectionString'
const pool = new Pool({
  connectionString: "postgresql://breno:Uk49v4cq8ht8BNt3NEnqEmffIZF4rqEh@dpg-d9h8ha7avr4c73c7hju0-a.oregon-postgres.render.com/automation_db_m2sd",
  ssl: {
    rejectUnauthorized: false // Permite certificados autoassinados no ambiente local
  }
});

const defaultUser = (lid,name=null) => ({ lid: lid, name: (name ?? '~'), type: "user", restrict: [] })

async function listAllUsers(){
  try {
    const users = await pool.query(`SELECT * FROM "baileys_usuarios"`)
    return users?.rows ? users.rows : []
  } catch(erro){
    console.log("ListAllUsers: "+erro.message)
    return []
  }
}

async function getUserContext(lid){
  try {
    const user = await pool.query(`SELECT * FROM "baileys_usuarios" WHERE lid = $1 LIMIT 1`, [lid])
    return (user?.rows && user.rows.length>0) ? {user:user.rows[0],exists:true} : {user:defaultUser(lid)}
  } catch (erro){
    console.log("getUser: "+erro.message)
    return { user: defaultUser(lid) }
  }
}

async function updateUserContext(user, key=null){
  try {
    const conflictQuery = key ? `ON CONFLICT (lid) DO UPDATE SET ${key} = EXCLUDED.${key}` : ''
    await pool.query(`INSERT INTO "baileys_usuarios" (lid,name,type,restrict) VALUES ($1, $2, $3, $4) ${conflictQuery}`, [user.lid, user.name, user.type, user.restrict])
  } catch (erro){
    console.log("updateUser: "+erro.message)
  }
}

try {
  // Testa a conexão executando uma query simples
  const res = await pool.query("SELECT NOW()");
  console.log("Conectado com sucesso! Hora no banco:", res.rows[0].now);
  const { user = await getUserContext( "321" )
  user.name = "breno"
  console.log(user)
  await updateUserContext( user, "name" )
  const users = await listAllUsers()
  console.log(users)

} catch (err) {
  console.error("Erro ao conectar no banco:", err.message);
} finally {
  // Fecha o pool corretamente
  await pool.end();
}
