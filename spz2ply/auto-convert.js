// SPZ2PLY Otomatik Dönüştürücü - Basitleştirilmiş Sürüm
// Kullanım: node auto-convert.js (parametre gerektirmez)

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { loadSpz, serializePly } from 'spz-js';

// Klasör yapısı
const IMPORT_DIR = './import';
const EXPORT_DIR = './export';

// Desteklenen formatlar
const SUPPORTED_FORMATS = ['.spz'];

// Renk kodları (Windows terminal desteği)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

// Gereksinimler kontrolü
function checkRequirements() {
  log('🔍 Gereksinimler kontrol ediliyor...', colors.cyan);
  
  // Node.js versiyonu
  const nodeVersion = process.version;
  log(`   Node.js: ${nodeVersion}`, colors.blue);
  
  // spz-js paketini kontrol et
  try {
    const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
    const spzJsVersion = packageJson.dependencies['spz-js'];
    log(`   spz-js: ${spzJsVersion}`, colors.blue);
  } catch (error) {
    log('   ❌ package.json bulunamadı!', colors.red);
    return false;
  }
  
  // node_modules kontrolü
  if (!existsSync('./node_modules/spz-js')) {
    log('   ❌ spz-js paketi kurulu değil!', colors.red);
    log('   💡 Çözüm: npm install komutunu çalıştırın', colors.yellow);
    return false;
  }
  
  log('   ✅ Tüm gereksinimler karşılanmış', colors.green);
  return true;
}

// Klasör yapısını hazırla
function setupDirectories() {
  log('📁 Klasör yapısı hazırlanıyor...', colors.cyan);
  
  // Import klasörü
  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, { recursive: true });
    log(`   ✅ "${IMPORT_DIR}" klasörü oluşturuldu`, colors.green);
  } else {
    log(`   ✅ "${IMPORT_DIR}" klasörü mevcut`, colors.blue);
  }
  
  // Export klasörü
  if (!existsSync(EXPORT_DIR)) {
    mkdirSync(EXPORT_DIR, { recursive: true });
    log(`   ✅ "${EXPORT_DIR}" klasörü oluşturuldu`, colors.green);
  } else {
    log(`   ✅ "${EXPORT_DIR}" klasörü mevcut`, colors.blue);
  }
}

// Dosyaları tara ve filtrele
function scanFiles() {
  log('🔎 Dosyalar taranıyor...', colors.cyan);
  
  if (!existsSync(IMPORT_DIR)) {
    log(`   ❌ "${IMPORT_DIR}" klasörü bulunamadı!`, colors.red);
    return [];
  }
  
  const files = [];
  const dirContents = readdirSync(IMPORT_DIR);
  
  for (const item of dirContents) {
    const fullPath = join(IMPORT_DIR, item);
    const stat = statSync(fullPath);
    
    if (stat.isFile()) {
      const ext = extname(item).toLowerCase();
      if (SUPPORTED_FORMATS.includes(ext)) {
        files.push({
          name: item,
          path: fullPath,
          size: (stat.size / 1024 / 1024).toFixed(2) // MB cinsinden
        });
        log(`   📄 ${item} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`, colors.blue);
      }
    }
  }
  
  if (files.length === 0) {
    log(`   ⚠️  "${IMPORT_DIR}" klasöründe desteklenen dosya bulunamadı`, colors.yellow);
    log(`   💡 Desteklenen formatlar: ${SUPPORTED_FORMATS.join(', ')}`, colors.yellow);
  } else {
    log(`   ✅ ${files.length} adet dosya bulundu`, colors.green);
  }
  
  return files;
}

// Tek dosya dönüştürme
async function convertFile(inputFile, outputFile) {
  try {
    const fileBuffer = readFileSync(inputFile);
    const gs = await loadSpz(fileBuffer);
    const plyData = serializePly(gs);
    writeFileSync(outputFile, Buffer.from(plyData));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Toplu dönüştürme işlemi
async function processFiles(files) {
  if (files.length === 0) {
    log('📄 İşlenecek dosya bulunamadı', colors.yellow);
    return;
  }
  
  log(`🔄 ${files.length} dosya dönüştürülüyor...`, colors.cyan);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${i + 1}/${files.length}]`;
    const inputPath = file.path;
    const outputName = basename(file.name, extname(file.name)) + '.ply';
    const outputPath = join(EXPORT_DIR, outputName);
    
    log(`${progress} ${file.name} → ${outputName}`, colors.blue);
    
    // Dosya zaten varsa kontrol et
    if (existsSync(outputPath)) {
      log(`   ⚠️  Hedef dosya zaten mevcut, üzerine yazılıyor...`, colors.yellow);
    }
    
    const result = await convertFile(inputPath, outputPath);
    
    if (result.success) {
      const outputStat = statSync(outputPath);
      const outputSize = (outputStat.size / 1024 / 1024).toFixed(2);
      log(`   ✅ Başarılı (${outputSize} MB)`, colors.green);
      successCount++;
    } else {
      log(`   ❌ Hata: ${result.error}`, colors.red);
      errorCount++;
    }
  }
  
  // Özet rapor
  log('\n📊 İşlem Özeti:', colors.bright);
  log(`   ✅ Başarılı: ${successCount}`, colors.green);
  if (errorCount > 0) {
    log(`   ❌ Hatalı: ${errorCount}`, colors.red);
  }
  log(`   📁 Çıktı klasörü: ${EXPORT_DIR}`, colors.cyan);
}

// Ana fonksiyon
async function main() {
  console.clear();
  log('🚀 SPZ2PLY Otomatik Dönüştürücü', colors.bright + colors.magenta);
  log('   Basit • Hızlı • Sezgisel\n', colors.cyan);
  
  // 1. Gereksinimler kontrolü
  if (!checkRequirements()) {
    process.exit(1);
  }
  console.log();
  
  // 2. Klasör yapısını hazırla
  setupDirectories();
  console.log();
  
  // 3. Dosyaları tara
  const files = scanFiles();
  console.log();
  
  // 4. Dönüştürme işlemi
  await processFiles(files);
  
  // 5. Kullanım talimatları (dosya bulunamadıysa)
  if (files.length === 0) {
    log('\n💡 Nasıl Kullanılır:', colors.bright + colors.yellow);
    log(`   1. .spz dosyalarınızı "${IMPORT_DIR}" klasörüne kopyalayın`, colors.yellow);
    log(`   2. Bu komutu tekrar çalıştırın: node auto-convert.js`, colors.yellow);
    log(`   3. Dönüştürülen .ply dosyaları "${EXPORT_DIR}" klasöründe olacak`, colors.yellow);
  }
  
  log('\n🎉 İşlem tamamlandı!', colors.bright + colors.green);
}

// Hata yakalama
process.on('uncaughtException', (error) => {
  log(`\n❌ Beklenmeyen hata: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`\n❌ Promise hatası: ${reason}`, colors.red);
  process.exit(1);
});

// Programı başlat
main().catch(error => {
  log(`\n❌ Ana fonksiyon hatası: ${error.message}`, colors.red);
  process.exit(1);
});