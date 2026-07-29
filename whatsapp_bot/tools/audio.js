import gTTS from 'gtts';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os'
ffmpeg.setFfmpegPath(ffmpegPath);

export async function generateAudio(txt) {
    // Retorna uma Promise para que quem chama a função consiga usar o 'await'
    return new Promise((resolve) => {
        try {
            const gtts = new gTTS(txt, 'pt-br');
            const temp_path = `midia_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`;
            const temp_file = path.join(os.tmpdir(), temp_path);
            const final_path = `midia_${Date.now()}_${Math.floor(Math.random() * 1000)}.ogg`;
            const final_file = path.join(os.tmpdir(), final_path);
            // 1. Executa o salvamento do gTTS
            gtts.save(temp_file, function (err) {
                if (err) {
                    console.error("Erro no gTTS:", err.message);
                    return resolve(null); // Retorna null em caso de erro no gTTS
                }
                // 2. Com o arquivo temporário criado, inicia o FFmpeg
                ffmpeg(temp_file)
                    .audioCodec('libvorbis')
                    .audioFilters('asetrate=22050,atempo=1.40')
                    .save(final_file)
                    .on('end', () => {
                        try {
                            // Remove o temporário de forma síncrona com segurança
                            if (fs.existsSync(temp_file)) {
                                fs.unlinkSync(temp_file);
                            }
                        } catch (unlinkErr) {
                            console.error("Erro ao apagar temporário:", unlinkErr.message);
                        }
                        // Retorna com sucesso o caminho do arquivo gerado
                        resolve(final_file); 
                    })
                    .on('error', (ffmpegErr) => {
                        console.error("Erro no FFmpeg:", ffmpegErr.message);
                        // Limpa o arquivo temporário mesmo se o FFmpeg falhar
                        if (fs.existsSync(temp_file)) fs.unlinkSync(temp_file);
                        resolve(null); // Retorna null em caso de erro no processamento
                    });
            });
        } catch (err) {
            console.error("Erro geral na função:", err.message);
            resolve(null); 
        }
    });
}