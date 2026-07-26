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

        // avisa quem criou, só quando o lembrete era pra OUTRA pessoa
        if (lembrete.para_outra_pessoa) {
          try {
            await sock.sendMessage(lembrete.jid, {
              text: `✅ Seu lembrete "${lembrete.texto}" foi entregue.`,
            });
          } catch (erroAviso) {
            console.log(`Aviso: não consegui notificar o criador do lembrete #${lembrete.id}:`, erroAviso.message);
            // não interrompe nada — a entrega principal já aconteceu
          }
        }

        await apagarLembrete(lembrete.id);
      } catch (erro) {
        console.log(`Erro ao processar lembrete #${lembrete.id}:`, erro.message);
      }
    }
  }, 30000);
}