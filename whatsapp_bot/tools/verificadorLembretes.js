// verificadorLembretes.js
import { buscarPendentesVencidos, apagarLembrete } from './lembretes.js';

export function iniciarVerificadorLembretes(sock) {
  setInterval(async () => {
    let pendentes;
    try {
      pendentes = await buscarPendentesVencidos();
    } catch (erro) {
      console.log('Erro ao buscar lembretes pendentes:', erro.message);
      return;
    }

    for (const lembrete of pendentes) {
      try {
        const texto = lembrete.para_outra_pessoa
          ? `*[⏰ ${lembrete.criado_por_nome}]* ${lembrete.texto}`
          : `⏰ ${lembrete.texto}`;

        await sock.sendMessage(lembrete.remote_jid, { text: texto });
        if(lembrete.para_outra_pessoa) await sock.sendMessage(lembrete.jid, { text: `Lembrete enviado: [${lembrete.criado_por_nome}] ${lembrete.texto}` })
        await apagarLembrete(lembrete.id);
      } catch (erro) {
        console.log(`Erro ao processar lembrete #${lembrete.id}:`, erro.message);
        // não apaga — continua tentando nos próximos ciclos, mas não trava os outros
      }
    }
  }, 30000);
}