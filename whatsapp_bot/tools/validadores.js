import { Commands } from "../comandos.js";

export const validateType = {
    number: {
        test: (valor) => valor != null && Number.isFinite(Number(valor)) && /^-?\d+(\.\d+)?$/.test(valor.trim()),
    },
    phone_number: {
        test: (valor) => /^\d{11,13}$/.test(valor),
    },
    duration: {
        test: (valor) => valor != null && /^(\d+[dhms])+$/.test(valor),
    },
    url: {
        test: (valor) => {
            if (!valor) return false;
            try {
                const u = new URL(valor);
                return u.protocol === 'http:' || u.protocol === 'https:'; // bloqueia javascript:, file:, etc
            } catch { return false; }
        },
    },
    text: {
        test: (valor) => typeof valor === 'string' && valor.trim().length > 0,
    },
    cmd: {
        test: (valor) => valor != null && Boolean(Commands[valor.toLowerCase()]), // aceita .Ping ou .ping
    },
    // novos, que valem a pena ter:
    boolean: {
        test: (valor) => ['sim', 'nao', 'não', 's', 'n', 'yes', 'no'].includes(valor?.toLowerCase()),
        parse: (valor) => ['sim', 's', 'yes'].includes(valor.toLowerCase()),
    },
    mention: {
        test: (valor, ctx) => (ctx?.mentions?.length ?? 0) > 0,
    },
};

export const validateCond = {
    is_owner: {
        test: (ctx) => ctx.isBot
    },
    is_quoted: {
        test: (ctx) => ctx.isQuoted
    },
    is_mentioned: {
        test: (ctx) => ctx.mentions?.length > 0 ?? false
    },
    is_view: {
        test: (ctx) => ctx.isView
    },
    is_quoted_view: {
        test: (ctx) => ctx.isQuoted && (ctx.quotedMessage[ctx.quotedType]?.viewOnce ?? false)
    },
    is_view_only_owner: {
        test: (ctx) => !ctx.isView || ctx.isBot
    },
    msg_is_image: {
        test: (ctx) => ctx.msgType === 'imageMessage'
    },
    msg_is_video: {
        test: (ctx) => ctx.msgType === 'videoMessage'
    },
    quoted_is_image: {
        test: (ctx) => validateCond.is_quoted.test(ctx) && ctx.quotedType === 'imageMessage'
    },
    quoted_is_video: {
        test: (ctx) => validateCond.is_quoted.test(ctx) && ctx.quotedType === 'videoMessage'
    },
}