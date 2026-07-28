// tipo 'ban' 'admin' 'owner' 'muted'

import { pool } from "./db.js";
import { validateCond, validateType } from "./validadores.js";

const hieraquia = ['owner','admin','user']
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
const defaultUser = (lid,name=null) => ({ lid: lid, name: (name ?? '~'), type: "user", restrict: [] })

export async function listAllUsers(){
  try {
    await init()
    const users = await pool.query(`SELECT * FROM "baileys_usuarios"`)
    return users?.rows ? users.rows : []
  } catch(erro){
    console.log("ListAllUsers: "+erro.message)
    return []
  }
}

async function getUserContext(lid,name=null){
  try {
    await init()
    const user = await pool.query(`SELECT * FROM "baileys_usuarios" WHERE lid = $1 LIMIT 1`, [lid])
    return (user?.rows && user.rows.length>0) ? {
        user: user.rows[0], exists: true
    }: {
        user: defaultUser(lid,name)
    }
  } catch (erro){
    console.log("getUser: "+erro.message)
    return {
        user: defaultUser(lid,name)
    }
  }
}

async function updateUserContext(user, key=null){
  try {
    await init()
    const conflictQuery = key ? `ON CONFLICT (lid) DO UPDATE SET ${key} = EXCLUDED.${key}` : ''
    await pool.query(`INSERT INTO "baileys_usuarios" (lid,name,type,restrict) VALUES ($1, $2, $3, $4) ${conflictQuery}`, [user.lid, user.name, user.type, user.restrict])
  } catch (erro){
    console.log("updateUser: "+erro.message)
  }
}

export async function updateUserRestrict(lid, name, cmd, mode=null){
    const { user } = await getUserContext(lid, name)
    let restrict = user.restrict ?? []

    if(mode === 'add'){
        if(!restrict.includes(cmd)){
            restrict.push(cmd)
        }
    } else if(mode === 'rem'){
        restrict = restrict.filter( item => (item !== cmd) ).map(item => item)
    }

    user.restrict = restrict;
    await updateUserContext(user,'restrict')
}

async function isPermitted(ctx, per, cmd_name){
    if(ctx.isBot) return {
        permitted: true
    }
    const { user, exists } = await getUserContext(ctx.lid, ctx.name)
    if(user?.type === 'owner') return {
        permitted: true
    }
    if(!exists){
        await updateUserContext(user)
    }
    if(user.name !== ctx.name){
        user.name = ctx.name
        await updateUserContext(user,'name')
    }
    if(user?.type === 'ban') return {
        permitted: false,
        user_permission: user.type,
        banned: true
    }
    if(user?.restrict.includes(cmd_name)) return {
        permitted: false,
        user_permission: user.type,
        restrict: true
    }
    const min_index = hieraquia.indexOf(per)
    const min_user = hieraquia.indexOf(user.type)
    if(min_user > min_index) return {
        permitted: false,
        user_permission: user.type
    }
    return {
        permitted: true
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
    if(!cmd?.args)
        cmd.args = []
    if(!cmd.permission)
        cmd.permission = 'user'
    if(!cmd.conditions)
        cmd.conditions = []

    const { permitted, user_permission, banned, restrict } = await isPermitted(ctx, cmd.permission, cmd_name)
    if(!permitted){
        if(banned) return {
            exec: false,
            error: {
                reason: 'banned',
                cmd: cmd_name
            }
        }
        if(restrict) return {
            exec: false,
            error: {
                reason: 'restriction',
                cmd: cmd_name
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
    return required
}
