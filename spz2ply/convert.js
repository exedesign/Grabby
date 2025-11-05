// Dosya Adı: convert.js

import { readFileSync, writeFileSync } from 'fs';
import { loadSpz, serializePly } from 'spz-js';

// Komut satırından gelen argümanları al (node convert.js <input> <output>)
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error("Hata: Giriş ve çıkış dosyası belirtmelisiniz.");
  console.log("Kullanım: node convert.js <dosya.spz> <dosya.ply>");
  process.exit(1);
}

// Ana dönüştürme fonksiyonu
async function convertSpzToPly() {
  try {
    const fileBuffer = readFileSync(inputFile);
    const gs = await loadSpz(fileBuffer);
    const plyData = serializePly(gs);
    writeFileSync(outputFile, Buffer.from(plyData));
    
    // Sadece başarı durumunda konsola yaz (betiklerin sessiz çalışması için)
    // console.log(`Başarıyla dönüştürüldü: ${outputFile}`);
  } catch (error) {
    console.error(`Hata (${inputFile}): ${error.message}`);
  }
}

convertSpzToPly();