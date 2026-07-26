// verificadorLembretes.js
import { buscarPendentesVencidos, marcarEnviado } from './lembretes.js';

export function iniciarVerificadorLembretes(sock) {
  setInterval(async () => {
    try {
      const pendentes = await buscarPendentesVencidos();
      for (const lembrete of pendentes) {
        await sock.sendMessage(lembrete.remote_jid, {
          text: `⏰ Lembrete: ${lembrete.texto}`,
        });
        await marcarEnviado(lembrete.id);
      }
    } catch (erro) {
      console.log('Erro ao verificar lembretes:', erro.message);
    }
  }, 30000); // checa a cada 30 segundos
}