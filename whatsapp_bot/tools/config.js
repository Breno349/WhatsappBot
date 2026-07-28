import 'dotenv/config'

export const config = carregarConfiguracoes()

function carregarConfiguracoes(){
    console.log('\x1b[32m%s\x1b[0m', '<<===  Carregando configurações ===>>')
    
    if(!process.env.LOGIN_MODE){
        console.log('\x1b[31m%s:\x1b[0m %s', 'LOGIN_MODE','deve ser definida como \x1b[33m"db"\x1b[0m ou \x1b[33m"file"\x1b[0m')
        process.exit(1)
    } else if(process.env.LOGIN_MODE === "db"){
        console.log('\x1b[34m%s:\x1b[0m %s', 'LOGIN_MODE',process.env.LOGIN_MODE)
        if(!process.env.DB_HOST){
            console.log('\x1b[31m%s:\x1b[0m %s', 'DB_HOST','Não definido')
            process.exit(1)
        }
        if(!process.env.DB_USER){
            console.log('\x1b[31m%s:\x1b[0m %s', 'DB_USER','Não definido')
            process.exit(1)
        }
        if(!process.env.DB_NAME){
            console.log('\x1b[31m%s:\x1b[0m %s', 'DB_NAME','Não definido')
            process.exit(1)
        }
        if(!process.env.DB_PASSWORD){
            console.log('\x1b[31m%s:\x1b[0m %s', 'DB_PASSWORD','Não definido')
            process.exit(1)
        }
        if(!process.env.DB_PORT){
            console.log('\x1b[31m%s:\x1b[0m %s', 'DB_PORT','Não definido, Padrão: 5432')
        }
    } else if(process.env.LOGIN_MODE === "file"){
        console.log('\x1b[34m%s:\x1b[0m %s', 'LOGIN_MODE',process.env.LOGIN_MODE)
    } else {
        console.log('\x1b[31m%s\x1b[0m %s','LOGIN_MODE','Definição incorreta')
        process.exit(1)
    }
    if(!process.env.LOGIN_METHOD){
        console.log('\x1b[31m%s:\x1b[0m %s', 'LOGIN_METHOD','deve ser definida como \x1b[33m"qrcode"\x1b[0m ou \x1b[33m"code"\x1b[0m')
        process.exit(1)
    } else if(process.env.LOGIN_METHOD === "qrcode"){
        console.log('\x1b[34m%s:\x1b[0m %s', 'LOGIN_METHOD', 'qrcode')
    } else if(process.env.LOGIN_METHOD == "code"){
        if(!process.env.PHONE_NUMBER){
            console.log('\x1b[31m%s:\x1b[0m %s', 'LOGIN_METHOD > PHONE_NUMBER','deve ser definida como seu número no formato 0012345678901')
            process.exit(1)
        } else {
            console.log('\x1b[34m%s:\x1b[0m %s', 'LOGIN_METHOD', 'code')
        }
    } else {
        console.log('\x1b[31m%s\x1b[0m %s','LOGIN_METHOD','Definição incorreta')
        process.exit(1)
    }
    if(!process.env.LOGIN_NAME){
        console.log('\x1b[31m%s:\x1b[0m %s', 'LOGIN_NAME','deve ser definida como o nome da sessão')
        process.exit(1)
    } else {
        console.log('\x1b[34m%s:\x1b[0m %s', 'LOGIN_NAME',process.env.LOGIN_NAME)
    }
    if(!process.env.PREFIXO){
        console.log('\x1b[34m%s:\x1b[0m %s', 'PREFIXO','Não definido, Padrão: "."')
    }

    return {
        login_mode: process.env.LOGIN_MODE,
        login_method: process.env.LOGIN_METHOD,
        login_name: process.env.LOGIN_NAME,
        phone_number: process.env.LOGIN_METHOD === "code" ? process.env.PHONE_NUMBER : null,
        prefixo: process.env.PREFIXO ? process.env.PREFIXO : "."
    }
}