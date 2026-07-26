import 'dotenv/config'

export const config = loadConfig()

function loadConfig(){
    if(!process.env.SESSION_NAME){
        console.log("CONFIG:  Não há SESSION_NAME")
        process.exit(1)
    }
    if(!process.env.SESSION_MODE){
        console.log("CONFIG:  Não há SESSION_MODE")
        process.exit(1)
    } else if(process.env.SESSION_MODE === 'file'){
        if(process.env.SESSION_NAME.length <= 0){
            console.log("CONFIG:  Defina um valor para SESSION_MODE (file)")
            process.exit(1)
        }
    } else if(process.env.SESSION_MODE === 'db'){
        if(!process.env.DB_USER){
            console.log("CONFIG:  Não há DB_USER")
            process.exit(1)
        }
        if(!process.env.DB_HOST){
            console.log("CONFIG:  Não há DB_HOST")
            process.exit(1)
        }
        if(!process.env.DB_NAME){
            console.log("CONFIG:  Não há DB_NAME")
            process.exit(1)
        }
        if(!process.env.DB_PASSWORD){
            console.log("CONFIG:  Não há DB_PASSWORD")
            process.exit(1)
        }
        if(!process.env.DB_PORT){
            console.log("CONFIG:  Não há DB_PORT (Opcional)")
        }
    } else {
        console.log("CONFIG:  SESSION_MODE deve ser 'db' ou 'file'")
        process.exit(1)
    }
    if(!process.env.LOGIN_MODE){
        console.log("CONFIG:  Não há LOGIN_MODE")
        process.exit(1)
    } else {
        if(process.env.LOGIN_MODE !== 'code' && process.env.LOGIN_MODE !== 'qrcode'){
            console.log("CONFIG:  Não há definição 'code' ou 'qrcode' para LOGIN_MODE")
            process.exit(1)
        }
        if(process.env.LOGIN_MODE === 'code' && !process.env.ADMIN_PHONE){
            console.log("CONFIG:  Não há definição para ADMIN_PHONE")
            process.exit(1)
        }
    }
    if(!process.env.PREFIX){
        console.log("CONFIG:  Não há PREFIX")
        process.exit(1)
    } else if(process.env.PREFIX.length !== 1){
        console.log("CONFIG:  Defina PREFIX com apenas 1 caracter")
        process.exit(1)
    }
    if(!process.env.AUTOREACT){
        console.log("CONFIG:  AUTOREACT não definido, padrão: sim")
    }
    if(!process.env.TELEGRAM_BOT_TOKEN){
        console.log("CONFIG:  Defina TELEGRAM_BOT_TOKEN")
        process.exit(1)
    }
    if(!process.env.TELEGRAM_CHATID){
        console.log("CONFIG:  Defina TELEGRAM_CHATID")
        process.exit(1)
    }
    return {
        isCode: process.env.LOGIN_MODE === 'code' ? true : undefined,
        isQRCode: process.env.LOGIN_MODE === 'qrcode' ? true : undefined,
        printQR: process.env.LOGIN_MODE === 'code' ? false : true,
        isDB: process.env.SESSION_MODE === 'db' ? true : false,
        session_name: process.env.SESSION_NAME,
        admin_phone: process.env.LOGIN_MODE === 'code' ? process.env.ADMIN_PHONE : '',
        prefixo: process.env.PREFIX,
        autoreact: process.env.AUTOREACT ?? true,
    }
}