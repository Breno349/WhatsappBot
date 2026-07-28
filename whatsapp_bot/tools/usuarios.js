import { pool } from "./db.js";
import { validateCond, validateType } from "./validadores.js";

const hieraquia = ['owner','admin','user','ban']
let table_name = 'baileys_usuarios';

let table_created = false;
async function init(){
    if(!table_created){
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "${table_name}" (
            lid TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type VARCHAR(10) NOT NULL,
            restrict TEXT[] NOT NULL
            );
        `);
        table_created = true;
    }
}

async function findUser(lid){
    await init()
    const list = await pool.query(`
        SELECT * FROM "${table_name}" WHERE lid = $1
    `, [lid])
    return list?.rows[0] ?? { restrict: [], name: '~', type: 'user' }
}

async function saveUserRestrict(lid, user) {
    await pool.query(`
      INSERT INTO "${table_name}" (lid, name, type, restrict)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (lid) DO UPDATE 
      SET restrict = EXCLUDED.restrict
    `, [lid, user.name ?? '...', user.type ?? 'user', user.restrict]);
}
async function saveUserName(lid, user) {
    await pool.query(`
      INSERT INTO "${table_name}" (lid, name, type, restrict)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (lid) DO UPDATE 
      SET name = EXCLUDED.name
    `, [
        lid, 
        user.name ?? '...', 
        user.type ?? 'user', 
        user.restrict ?? [] // Garante um array vazio se não existir restrição ainda
    ]);
}

async function saveUserType(lid, user) {
    await pool.query(`
      INSERT INTO "${table_name}" (lid, name, type, restrict)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (lid) DO UPDATE 
      SET type = EXCLUDED.type
    `, [
        lid, 
        user.name ?? '...', 
        user.type ?? 'user', 
        user.restrict ?? []
    ]);
}

export async function modifyRestriction(lid, fun, mode) {
    const user = await findUser(lid)
    let restrict = user.restrict ?? [];
    if (mode === 'add') {
        if (!restrict.includes(fun)) {
            restrict.push(fun);
        }
    } else if (mode === 'rem') {
        restrict = restrict.filter(item => item !== fun);
    }
    user.restrict = restrict;
    await saveUserRestrict(lid, user);
}

async function getUserContext(ctx){
    if(ctx.isBot) return {
        type: 'owner'
    }
    const register = await findUser( ctx.lid )
    return {
        type: register?.type ?? 'user',
        register
    }
}

export async function listUser(){
    await init()
    const { rows: users } = await pool.query(`
        SELECT * FROM "${table_name}"
    `)
    return users;
}

async function isPermitted(ctx, per, cmd_name){
    if (user_per.type === 'owner') {
        return { permited: true, user_permission: user_per.type };
    const user_per = await getUserContext(ctx)
    if(user_per.register?.name !== ctx.name){
        user_per.register.name = ctx.name
        await saveUserName(ctx.lid, user_per.register)
    }
    //console.log( user_per )
    const restrict = user_per.register?.restrict ?? []
    if(restrict.includes(cmd_name)){
        return {
            permited: false,
            user_permission: user_per.type,
            restrict: true
        }
    }
    }
    const i_cmd = per.map(item => hieraquia.indexOf(item))
    const i_user = hieraquia.indexOf(user_per.type)
    const limiteMaisPermissivo = Math.max(...i_cmd) // o nível MENOS exigente entre os listados
    return {
        permited: i_user <= limiteMaisPermissivo, // usuário precisa ser igual ou MAIS privilegiado (índice igual ou menor)
        user_permission: user_per.type
    }
}

function checkRequiredArgs(ctx, args){
    let i_arg = 0;
    let argRet = {}
    for(const i in args){
        if(args[i].required){
            const val = args[i].infinity ?
                ctx.args.slice(i_arg).join(' ') :
                ctx.args[i_arg];
            if(!validateType[args[i].type].test( val )){
                return {
                    exec: false,
                    error: {
                        reason: 'arg',
                        arg: args[i].name,
                        arg_type: args[i].type
                    }
                }
            }
            argRet[args[i].name] = val;
            i_arg += 1;
        } else {
            const val = args[i].infinity ?
                ctx.args.slice(i_arg).join(' ') :
                ctx.args[i_arg];
            if(validateType[args[i].type].test( val )){
                argRet[args[i].name] = val;
                i_arg += 1;
            }
        }
    }
    return {
        exec: true,
        args: argRet
    }
}

function checkConditions(ctx, cmd){
    if(!cmd?.conditions){
        return {
            exec: true
        }
    }
    for(const cond of cmd.conditions){
        if(!validateCond[cond]) continue;
        const is_cond = validateCond[cond].test( ctx )
        if(!is_cond){
            return {
                exec: false,
                error: {
                    reason: 'condition',
                    cond: cond
                }
            }
        }
    }
    return {
        exec: true
    }
}

export async function validateCmd(ctx, cmd, cmd_name){
    const { permitted, user_permission , restrict } = await isPermitted(ctx, cmd.permission, cmd_name)
    if(!permitted){
        if(restrict){
            return {
                exec: false,
                error: {
                    reason: 'restriction',
                    cmd: cmd_name
                }
            }
        }
        return {
            exec: false,
            error: {
                reason: 'permission',
                cmd: cmd_name,
                permission: user_permission
            }
        };
    }

    const conditioned = checkConditions(ctx, cmd)
    if(!conditioned.exec){
        return conditioned;
    }

    const required = checkRequiredArgs(ctx, cmd.args)
    return required;
}
