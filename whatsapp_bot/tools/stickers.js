import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import util from 'util';
const execFileAsync = util.promisify(execFile);

export async function removerArquivo(arquivo){
    try {
        await fs.promises.unlink(arquivo);
    } catch (erro) {
        console.error(`Erro ao deletar o arquivo: ${erro.message}`);
    }
}

export async function convertToFiguraAnim(entrada){
    try {
        const nome = `midia_${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`;
        const caminho = path.join(os.tmpdir(), nome);
        await execFileAsync(ffmpegPath, [
            '-t', '6',                  // <- input option agora: para de LER a origem cedo
            '-i', entrada,
            '-vf', 'scale=512:512,fps=15', // fps menor
            '-pix_fmt', 'yuva420p',
            '-loop', '0',
            '-an',
            '-vsync', '0',
            '-c:v', 'libwebp',
            '-quality', '50',
            '-compression_level', '3',  // <- bem mais rápido
            '-y', caminho,
        ], { timeout: 30000 });
        const stats = fs.statSync(caminho);
        if (stats.size > 500 * 1024) {
            console.log(`Aviso: figurinha com ${(stats.size / 1024).toFixed(0)}KB — acima do limite de 500KB do WhatsApp`);
        }
        return caminho;
    } catch (erro){
        console.log('Erro ao converter figurinha: '+erro.message)
        return null;
    }
}

export async function convertToFigura(entrada){
    try {
        const nome = `midia_${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`;
        const caminho = path.join(os.tmpdir(), nome);
        await execFileAsync(ffmpegPath, [
            '-i', entrada,
            '-vf', 'scale=512:512',
            '-c:v', 'libwebp',
            '-y', caminho,
        ])
        return caminho;
    } catch (erro){
        console.log('Erro ao converter figurinha: '+erro.message)
        return null;
    }
}