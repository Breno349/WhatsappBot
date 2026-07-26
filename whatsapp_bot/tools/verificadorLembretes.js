// verificadorLembretes.js
import { buscarPendentesVencidos, marcarEnviado } from './lembretes.js';

export function iniciarVerificadorLembretes(sock) {
  setInterval(async () => {
    try {
      const pendentes = await buscarPendentesVencidos();
      for (const lembrete of pendentes) {
          const texto = lembrete.para_outra_pessoa
            ? `[*${lembrete.criado_por_nome}*] ${lembrete.texto}`
            : `${lembrete.texto}`;
          await sock.sendMessage(lembrete.remote_jid, { text: texto });
          await marcarEnviado(lembrete.id);
      }
    } catch (erro) {
      console.log('Erro ao verificar lembretes:', erro.message);
    }
  }, 30000); // checa a cada 30 segundos
}