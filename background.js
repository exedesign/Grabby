'use strict';

// Varsayılan formatlar
const DEFAULT_FORMATS = ['.spz', '.ply', '.splat', '.gsplat', '.npz'];

// Gaussian Splatting WebP dosya isimleri
const GAUSSIAN_SPLATTING_FILES = [
  'means_l.webp',
  'means_u.webp', 
  'scales.webp',
  'quats.webp',
  'sh0.webp',
  'shN_centroids.webp',
  'shN_labels.webp',
  'meta.json'  // Kamera konumları ve render ayarları
];

// Aktif dosya uzantıları
let TARGET_EXTENSIONS = [...DEFAULT_FORMATS];

// Tab başına bulunan dosyaları tutmak için hafıza
const fileCache = new Map(); // tabId -> Set<url>

// Formatları storage'dan yükle
chrome.storage.sync.get('formats', ({ formats }) => {
  if (formats) {
    console.log('📋 Loading custom formats from storage:', formats);
    TARGET_EXTENSIONS = formats;
  } else {
    console.log('📋 Using default formats:', DEFAULT_FORMATS);
  }
  console.log('🎯 Current TARGET_EXTENSIONS:', TARGET_EXTENSIONS);
});

// URL'den dosya adı çıkaran yardımcı fonksiyon
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || '';
  } catch (e) {
    return url.split('/').pop() || '';
  }
}

// Bir dosyanın hedef uzantılardan birine sahip olup olmadığını kontrol et
function isTargetFile(url, disposition, contentType) {
  if (!url) return false;
  
  // Debug logging
  console.log('🔍 TESTING FILE:', url);
  console.log('  Content-Disposition:', disposition || 'none');
  console.log('  Content-Type:', contentType || 'none');
  console.log('  Current Target Extensions:', TARGET_EXTENSIONS);
  
  let checkedFilenames = [];
  
  // Gaussian Splatting WebP dosyalarını kontrol et
  const filename = getFilenameFromUrl(url);
  console.log('  Base filename from URL:', filename);
  
  if (GAUSSIAN_SPLATTING_FILES.some(gsFile => filename.toLowerCase().includes(gsFile))) {
    console.log('  ✅ Gaussian Splatting file detected:', filename);
    return true;
  }
  
  // 1. Content-Disposition başlığından dosya adını kontrol et
  if (disposition) {
    console.log('  📋 Checking Content-Disposition:', disposition);
    // RFC 5987 ve RFC 6266 uyumlu parsing
    const filenameRegexes = [
      /filename\*?=([^;]*)/i,           // filename= ve filename*= 
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i  // mevcut regex
    ];
    
    for (const regex of filenameRegexes) {
      const matches = regex.exec(disposition);
      if (matches && matches[1]) {
        let filename = matches[1];
        console.log('    Raw match:', filename);
        
        // URL encoding ve quotes temizle
        filename = filename.replace(/['"]/g, '');
        if (filename.includes('=')) {
          filename = filename.split('=').pop(); // UTF-8'' gibi prefixleri kaldır
        }
        filename = decodeURIComponent(filename).toLowerCase();
        
        if (filename) {
          checkedFilenames.push(filename);
          console.log('    Processed filename:', filename);
          
          if (TARGET_EXTENSIONS.some(ext => filename.endsWith(ext))) {
            const matchedExt = TARGET_EXTENSIONS.find(ext => filename.endsWith(ext));
            console.log('    ✅ MATCHED via Content-Disposition:', filename, '(extension:', matchedExt + ')');
            return true;
          } else {
            console.log('    ❌ No extension match for:', filename);
          }
        }
      }
    }
  }
  
  // 2. URL'den dosya adlarını çıkar - gelişmiş parsing
  try {
    const urlObj = new URL(url);
    let cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    let pathname = urlObj.pathname.toLowerCase();
    
    // Son segment'i al
    const lastSegment = pathname.split('/').filter(p => p).pop() || '';
    if (lastSegment) checkedFilenames.push(lastSegment);
    
    // Query parametrelerinden de filename'leri kontrol et
    const urlParams = urlObj.searchParams;
    ['filename', 'file', 'name', 'download', 'attachment'].forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        const cleanValue = decodeURIComponent(value).toLowerCase();
        checkedFilenames.push(cleanValue);
      }
    });
    
    console.log('  URL analysis - Clean URL:', cleanUrl);
    console.log('  URL analysis - Pathname:', pathname);
    console.log('  URL analysis - Last segment:', lastSegment);
    console.log('  All filenames to check:', checkedFilenames);
    
    // Tüm filename adaylarını kontrol et
    console.log('  🎯 Testing filenames against extensions:');
    for (const filename of checkedFilenames) {
      console.log('    Testing:', filename);
      const matchedExt = TARGET_EXTENSIONS.find(ext => filename.endsWith(ext));
      if (matchedExt) {
        console.log('    ✅ MATCHED extension:', matchedExt, 'in filename:', filename);
        return true;
      } else {
        console.log('    ❌ No match for:', filename);
      }
    }
    
    // URL path'in kendisini de kontrol et (extension olmadan)
    console.log('  🎯 Testing clean URL:', cleanUrl);
    const urlMatchedExt = TARGET_EXTENSIONS.find(ext => cleanUrl.endsWith(ext));
    if (urlMatchedExt) {
      console.log('  ✅ MATCHED extension in URL:', urlMatchedExt);
      return true;
    } else {
      console.log('  ❌ No extension match in URL');
    }
    
  } catch (e) {
    console.warn('  URL parsing error:', e);
    // Fallback: basit string kontrol
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    if (TARGET_EXTENSIONS.some(ext => cleanUrl.endsWith(ext))) {
      console.log('  ✅ Matched extension in fallback URL check');
      return true;
    }
  }
  
  // 3. Content-Type bazlı gelişmiş kontrol
  if (contentType) {
    console.log('  📁 Checking Content-Type:', contentType);
    const ct = contentType.toLowerCase();
    
    // Genişletilmiş MIME type listesi
    const modelMimeTypes = [
      'application/octet-stream',
      'application/binary',
      'application/ply',
      'model/ply',
      'model/mesh',
      'text/plain',
      'application/x-ply',
      'application/x-splat',
      'application/x-gsplat',
      'application/x-spz',
      'application/zip', // NPZ dosyaları için
      'application/x-compressed',
      'model/obj',
      'model/stl'
    ];
    
    const matchedMime = modelMimeTypes.find(mime => ct.includes(mime));
    const hasModelMime = !!matchedMime;
    
    if (hasModelMime) {
      console.log('    ✅ Found matching MIME type:', matchedMime);
      // Content-Type uyumlu ise, filename'lerde target extension var mı kontrol et
      const hasTargetExtInFilenames = checkedFilenames.some(filename => 
        TARGET_EXTENSIONS.some(ext => filename.includes(ext))
      );
      
      if (hasTargetExtInFilenames) {
        console.log('    ✅ MATCHED via Content-Type + filename combination');
        return true;
      }
      
      // Eğer hiç filename bulunamadıysa ve MIME type model/binary ise büyük ihtimalle target file
      if (checkedFilenames.length === 0 && 
          (ct.includes('model/') || ct.includes('application/octet-stream'))) {
        console.log('    ⚠️ Potential match via Content-Type only (no filename available):', ct);
        // Konservatif yaklaşım: sadece açık model MIME type'ları kabul et
        if (ct.includes('model/ply') || ct.includes('application/ply')) {
          console.log('    ✅ MATCHED via strong Content-Type indicator');
          return true;
        }
      }
    } else {
      console.log('    ❌ No matching MIME type found');
    }
  }
  
  console.log('  ❌ NO MATCH FOUND for:', url);
  console.log('    Checked filenames:', checkedFilenames);
  console.log('    Target extensions:', TARGET_EXTENSIONS);
  return false;
}

// Gaussian Splatting dosyalarını tarayan fonksiyon
async function scanForGaussianSplatting(tabId, baseUrl) {
  console.log('🔍 Scanning for Gaussian Splatting files...', { tabId, baseUrl });
  
  try {
    // TabId geçerliliğini kontrol et
    if (!tabId || tabId < 0) {
      console.warn('Invalid tabId for Gaussian scan:', tabId);
      return false;
    }
    
    // Tab'ın mevcut olup olmadığını kontrol et
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        console.warn('Cannot scan special URL:', tab?.url);
        return false;
      }
      
      // Tab durumunu kontrol et
      if (tab.status !== 'complete') {
        console.warn('Tab is still loading, skipping scan:', tab.status);
        return false;
      }
      
      // Frame'in hazır olup olmadığını kontrol et
      if (tab.discarded) {
        console.warn('Tab is discarded, cannot inject script');
        return false;
      }
      
    } catch (tabError) {
      console.warn('Tab not found or not accessible:', tabId, tabError.message);
      return false;
    }
    
    // Script injection'ı try-catch ile sar
    let results;
    try {
      // Content script kullanarak dosya varlığını kontrol et ve proje adını al
      results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
        const GAUSSIAN_FILES = ['means_l.webp', 'means_u.webp', 'scales.webp', 'quats.webp', 'sh0.webp', 'shN_centroids.webp', 'shN_labels.webp', 'meta.json'];
        
        // Sayfa başlığını al
        let projectTitle = document.title || 'Gaussian Splatting Model';
        if (projectTitle.toLowerCase().includes('untitled') || !projectTitle.trim()) {
          // Alternatif title kaynakları
          const h1 = document.querySelector('h1');
          if (h1 && h1.textContent.trim()) {
            projectTitle = h1.textContent.trim();
          } else {
            projectTitle = 'Gaussian Splatting Model';
          }
        }
        
        const foundFiles = [];
        const currentUrl = window.location.href;
        const baseDir = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
        
        // Her bir Gaussian dosyasını kontrol et
        return Promise.all(GAUSSIAN_FILES.map(filename => {
          return new Promise(resolve => {
            if (filename.endsWith('.json')) {
              // JSON dosyası için fetch kullan
              fetch(baseDir + filename)
                .then(response => {
                  if (response.ok) {
                    console.log('✅ Found Gaussian file:', filename);
                    foundFiles.push({
                      filename: filename,
                      url: baseDir + filename
                    });
                  } else {
                    console.log('❌ Not found:', filename);
                  }
                  resolve();
                })
                .catch(() => {
                  console.log('❌ Not found:', filename);
                  resolve();
                });
            } else {
              // WebP dosyası için image loading
              const img = new Image();
              img.onload = () => {
                console.log('✅ Found Gaussian file:', filename);
                foundFiles.push({
                  filename: filename,
                  url: baseDir + filename
                });
                resolve();
              };
              img.onerror = () => {
                console.log('❌ Not found:', filename);
                resolve();
              };
              img.src = baseDir + filename;
              
              // Timeout after 2 seconds
              setTimeout(() => {
                resolve();
              }, 2000);
            }
          });
        })).then(() => {
          return {
            projectTitle: projectTitle,
            foundFiles: foundFiles,
            baseUrl: baseDir
          };
        });
      }
    });
    
    } catch (scriptError) {
      console.error('Script injection failed:', scriptError.message);
      
      // Frame hatası özel kontrolü
      if (scriptError.message.includes('Frame') || scriptError.message.includes('removed')) {
        console.warn('Frame was removed, tab likely closed or navigated');
      } else if (scriptError.message.includes('Cannot access')) {
        console.warn('Cannot access tab, likely protected page');
      }
      
      return false;
    }

    // Results kontrolü
    console.log('Script execution results:', results);
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      console.warn('No results from script execution');
      return false;
    }
    
    const result = results[0]?.result;
    if (!result) {
      console.warn('No result data from script execution');
      return false;
    }
    
    if (result.foundFiles && Array.isArray(result.foundFiles) && result.foundFiles.length > 0) {
      console.log('🎯 Found', result.foundFiles.length, 'Gaussian Splatting files');
      
      // Virtual URL ile proje oluştur
      const virtualUrl = 'gaussian-splatting://project/' + tabId;
      
      // Cache'e ekle
      if (!fileCache.has(tabId)) {
        fileCache.set(tabId, new Map());
      }
      const cache = fileCache.get(tabId);
      
      cache.set(virtualUrl, {
        isGaussianProject: true,
        projectTitle: result.projectTitle,
        files: result.foundFiles,
        timestamp: Date.now()
      });
      
      // Storage'a kaydet
      await updateStorage(tabId, cache);
      
      return true;
    } else {
      console.log('No Gaussian Splatting files found or no foundFiles array');
      return false;
    }
    
  } catch (error) {
    console.error('Gaussian Splatting scan error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    console.log('TabId:', tabId, 'BaseUrl:', baseUrl);
    return false;
  }
}

// Storage güncelleme fonksiyonu
async function updateStorage(tabId, cache) {
  try {
    const storageData = {};
    const fileArray = Array.from(cache.entries());
    storageData[`files_${tabId}`] = fileArray;
    
    await chrome.storage.local.set(storageData);
    
    // Badge güncelle
    const fileCount = fileArray.length;
    chrome.action.setBadgeText({ 
      text: fileCount > 0 ? fileCount.toString() : '', 
      tabId: tabId 
    });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    console.log('💾 Storage updated for tab', tabId, '- Files:', fileCount);
  } catch (error) {
    console.error('Storage update error:', error);
  }
}

// Ağ isteklerini dinle
const monitor = {
  observe: details => {
    // chrome:// ve edge:// gibi özel URL'leri atla
    if (details.tabId === -1 || details.url.startsWith('chrome://') || details.url.startsWith('edge://')) {
      return;
    }

    // Content-Type başlığını kontrol et
    const contentType = details.responseHeaders
      .find(h => h.name.toLowerCase() === 'content-type');
    
    // Content-Disposition başlığını kontrol et
    const disposition = details.responseHeaders
      .find(h => h.name.toLowerCase() === 'content-disposition');
    
    if (isTargetFile(details.url, disposition?.value, contentType?.value)) {
      console.log('✅ Target file detected:', details.url);
      
      // Dosya boyutunu al
      const contentLength = details.responseHeaders
        .find(h => h.name.toLowerCase() === 'content-length');
      const fileSize = contentLength ? parseInt(contentLength.value, 10) : 0;

      // Dosyayı cache'e ekle
      if (!fileCache.has(details.tabId)) {
        fileCache.set(details.tabId, new Map()); // Set yerine Map kullan (url -> metadata)
      }
      const cache = fileCache.get(details.tabId);
      
      if (!cache.has(details.url)) {
        // Önce sayfa başlığını al - Basitleştirilmiş ve güvenilir title extraction
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          function: () => {
            // Proje/model odaklı title extraction
            function extractTitle() {
              console.log('🎯 Grabby - Starting PROJECT-FOCUSED title extraction...');
              
              const candidates = [];
              
              // GRUP 1: PROJE/MODEL SPESİFİK BAŞLIKLAR (Yüksek Öncelik)
              
              // 1. Model/proje spesifik meta tag'lar - JSON-LD structured data
              const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
              for (const script of jsonLdScripts) {
                try {
                  const data = JSON.parse(script.textContent);
                  // 3D model, creative work, dataset gibi tipleri ara
                  if (data.name && (data['@type']?.includes('CreativeWork') || 
                                   data['@type']?.includes('Dataset') || 
                                   data['@type']?.includes('3DModel') ||
                                   data['@type']?.includes('DigitalDocument'))) {
                    candidates.push({ source: 'json-ld-model', title: data.name.trim(), score: 120 });
                  }
                } catch (e) { /* JSON parse error, skip */ }
              }
              
              // 2. Model viewer spesifik element'ler ve data attribute'lar
              const modelViewers = [
                'model-viewer', '[data-model]', '[data-model-name]', '[data-title]', 
                '.model-title', '.project-title', '.asset-title', '.file-title'
              ];
              
              for (const selector of modelViewers) {
                const element = document.querySelector(selector);
                if (element) {
                  // data-model-name, data-title gibi attribute'ları kontrol et
                  const modelName = element.getAttribute('data-model-name') || 
                                   element.getAttribute('data-title') ||
                                   element.getAttribute('title');
                  if (modelName?.trim()) {
                    candidates.push({ source: `model-element-${selector}`, title: modelName.trim(), score: 115 });
                  }
                  
                  // Element'in text content'ini de kontrol et
                  const textContent = element.textContent?.trim();
                  if (textContent && textContent.length > 3 && textContent.length < 100) {
                    candidates.push({ source: `model-text-${selector}`, title: textContent, score: 110 });
                  }
                }
              }
              
              // 3. Dosya adı spesifik h1, h2 başlıkları (proje sayfalarında yaygın)
              const headings = document.querySelectorAll('h1, h2, .title, .name, .project-name, .model-name');
              for (const heading of headings) {
                const text = heading.textContent?.trim();
                if (text && text.length > 3 && text.length < 100) {
                  // Generic site başlıklarını filtrele
                  const isGeneric = /^(home|about|contact|login|register|download|upload|gallery|portfolio|blog|news)$/i.test(text);
                  if (!isGeneric) {
                    const tagScore = heading.tagName.toLowerCase() === 'h1' ? 105 : 100;
                    candidates.push({ source: `heading-${heading.tagName.toLowerCase()}`, title: text, score: tagScore });
                  }
                }
              }
              
              // GRUP 2: META TAG'LAR (Orta Öncelik - ama social media spesifik olanlar daha yüksek)
              
              // 4. Open Graph title - ama site adını filtrele
              const ogTitle = document.querySelector('meta[property="og:title"]')?.content?.trim();
              if (ogTitle && ogTitle.length > 3 && ogTitle.length < 200) {
                candidates.push({ source: 'og:title', title: ogTitle, score: 95 });
              }
              
              // 5. Twitter Card title
              const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content?.trim();
              if (twitterTitle && twitterTitle.length > 3 && twitterTitle.length < 200) {
                candidates.push({ source: 'twitter:title', title: twitterTitle, score: 90 });
              }
              
              // 6. Schema.org name (itemprop)
              const schemaName = document.querySelector('meta[itemprop="name"]')?.content?.trim();
              if (schemaName && schemaName.length > 3 && schemaName.length < 200) {
                candidates.push({ source: 'schema:name', title: schemaName, score: 85 });
              }
              
              // GRUP 3: DOCUMENT TITLE (Düşük Öncelik - çünkü genellikle site adı içerir)
              
              // 7. Document title - ama temizlenmiş hali
              if (document.title?.trim() && document.title.trim().length > 3) {
                candidates.push({ source: 'document.title', title: document.title.trim(), score: 70 });
              }
              
              // GRUP 4: URL BİLGİSİ (En Düşük Öncelik)
              
              // 8. URL pathname'den proje adı çıkar
              const urlParts = window.location.pathname.split('/').filter(p => p.length > 0);
              if (urlParts.length > 0) {
                // Son path segment'i (genellikle dosya/proje adı)
                const lastPart = decodeURIComponent(urlParts[urlParts.length - 1]);
                const urlTitle = lastPart
                  .replace(/\.(html|htm|php|asp|jsp|spz|ply|splat|gsplat|npz)$/i, '')
                  .replace(/[-_]/g, ' ')
                  .trim();
                if (urlTitle.length > 2 && urlTitle.length < 100) {
                  candidates.push({ source: 'url-path', title: urlTitle, score: 50 });
                }
                
                // Eğer birden fazla path varsa, proje/model klasör adı da olabilir
                if (urlParts.length > 1) {
                  const secondLastPart = decodeURIComponent(urlParts[urlParts.length - 2]);
                  if (secondLastPart.length > 2 && secondLastPart.length < 50) {
                    candidates.push({ source: 'url-folder', title: secondLastPart.replace(/[-_]/g, ' '), score: 45 });
                  }
                }
              }
              
              // 9. Query parameters'dan proje bilgisi
              const urlParams = new URLSearchParams(window.location.search);
              ['name', 'title', 'project', 'model', 'file', 'id'].forEach(param => {
                const value = urlParams.get(param);
                if (value && value.length > 2 && value.length < 100) {
                  const cleanValue = decodeURIComponent(value).replace(/[-_]/g, ' ').trim();
                  candidates.push({ source: `url-param-${param}`, title: cleanValue, score: 40 });
                }
              });
              
              // 10. En son çare: hostname bazlı
              const hostname = window.location.hostname.replace(/^www\./, '');
              candidates.push({ source: 'hostname-fallback', title: hostname + ' Model', score: 10 });
              
              console.log('  📋 All candidates found:', candidates.length);
              candidates.forEach(c => console.log(`    [${c.score}] ${c.source}: "${c.title.substring(0, 60)}"`));
              
              if (candidates.length > 0) {
                // Score'a göre sırala, aynı score'da kısa ve anlamlı olanı tercih et
                candidates.sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score;
                  // Aynı score'da çok kısa (<5) ya da çok uzun (>80) olanları cezalandır
                  const aLength = a.title.length;
                  const bLength = b.title.length;
                  if (aLength < 5) return 1;
                  if (bLength < 5) return -1;
                  if (aLength > 80) return 1;
                  if (bLength > 80) return -1;
                  return aLength - bLength;
                });
                
                const selected = candidates[0];
                console.log(`  🎯 SELECTED PROJECT TITLE: [${selected.score}] ${selected.source} → "${selected.title}"`);
                return selected.title;
              }
              
              console.log('  ⚠️ No suitable project title found, using fallback');
              return 'Unknown Project';
            }
            
            return extractTitle();
          }
        }).then(([{result: pageTitle}]) => {
          console.log('Background: Title extracted →', pageTitle);
          
          // Proje odaklı title temizleme ve normalize etme
          function cleanTitle(title) {
            if (!title || typeof title !== 'string') return 'Project';
            
            let cleaned = title.trim();
            if (!cleaned) return 'Project';
            
            console.log('  🧹 Cleaning title:', cleaned);
            
            // ADIM 1: Site adlarını ve gereksiz bilgileri temizle
            const siteSeparators = [
              { sep: ' - ', priority: 1 },
              { sep: ' | ', priority: 1 },
              { sep: ' :: ', priority: 2 },
              { sep: ' • ', priority: 2 },
              { sep: ' — ', priority: 1 },
              { sep: ' – ', priority: 1 },
              { sep: ' / ', priority: 3 }
            ];
            
            // Site adı kalıplarını tanımla
            const siteNamePatterns = [
              /\b(github|gitlab|sketchfab|thingiverse|cgtrader|turbosquid|artstation|behance|dribbble)(\.(com|io|org))?\b/i,
              /\b(free|download|model|3d|viewer|gallery|portfolio|showcase|collection)\b/i,
              /\b(home|about|contact|login|register|upload)\b/i
            ];
            
            for (const {sep, priority} of siteSeparators) {
              if (cleaned.includes(sep)) {
                const parts = cleaned.split(sep).map(p => p.trim());
                
                // Her parçayı analiz et ve en iyi proje adını seç
                let bestPart = null;
                let bestScore = -1;
                
                for (const part of parts) {
                  if (part.length < 3) continue;
                  
                  let score = part.length; // Uzunluk puanı
                  
                  // Site adı benzeri ifadeleri cezalandır
                  const hasSiteName = siteNamePatterns.some(pattern => pattern.test(part));
                  if (hasSiteName) score -= 50;
                  
                  // Çok generic kelimeleri cezalandır
                  const genericWords = ['home', 'index', 'main', 'page', 'site', 'web', 'app'];
                  if (genericWords.some(word => part.toLowerCase().includes(word))) score -= 30;
                  
                  // Sayılarla başlayan/biten parçaları cezalandır (tarih/versiyon olabilir)
                  if (/^\d+/.test(part) || /\d+$/.test(part)) score -= 20;
                  
                  // Spesifik dosya/proje kelimelerini ödüllendir
                  const projectWords = ['model', 'project', 'design', 'art', 'creation', '3d', 'render'];
                  if (projectWords.some(word => part.toLowerCase().includes(word))) score += 10;
                  
                  // Çok kısa ya da çok uzun parçaları cezalandır
                  if (part.length < 5) score -= 20;
                  if (part.length > 60) score -= 10;
                  
                  console.log(`    Part analysis: "${part}" → Score: ${score}`);
                  
                  if (score > bestScore) {
                    bestScore = score;
                    bestPart = part;
                  }
                }
                
                if (bestPart && bestScore > 0) {
                  cleaned = bestPart;
                  console.log(`    Selected best part: "${cleaned}" (Score: ${bestScore})`);
                  break;
                }
              }
            }
            
            // ADIM 2: Başlık/sondaki gereksiz bilgileri temizle
            cleaned = cleaned
              .replace(/^(the\s+|a\s+|an\s+)/i, '') // "The", "A", "An" başlangıçlarını kaldır
              .replace(/\s*[\(\[].*?[\)\]]\s*/g, ' ') // Parantez içi bilgileri kaldır
              .replace(/\s*\.\s*(com|org|net|io).*$/i, '') // Domain uzantıları
              .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
              .trim();
            
            // ADIM 3: Dosya uzantılarını kaldır
            cleaned = cleaned.replace(/\.(spz|ply|splat|gsplat|npz|obj|stl|fbx|gltf|glb)$/i, '');
            
            // ADIM 4: Uzunluk kontrolü ve kısaltma
            if (cleaned.length > 100) {
              cleaned = cleaned.substring(0, 100).trim();
              // Son kelimeyi tamamla
              const lastSpace = cleaned.lastIndexOf(' ');
              if (lastSpace > 70) {
                cleaned = cleaned.substring(0, lastSpace);
              }
            }
            
            // ADIM 5: Minimum gereksinimler kontrolü
            if (cleaned.length < 2) {
              // Çok kısa kaldıysa orijinal title'dan bir şey kurtarmaya çalış
              const words = title.split(/[\s\-_|]+/).filter(w => w.length > 2);
              if (words.length > 0) {
                // En uzun kelimeyi al
                cleaned = words.reduce((longest, current) => 
                  current.length > longest.length ? current : longest
                );
              } else {
                cleaned = 'Project';
              }
            }
            
            // ADIM 6: İlk harfi büyük yap
            if (cleaned.length > 0) {
              cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            }
            
            console.log(`  ✅ Final cleaned title: "${title}" → "${cleaned}"`);
            return cleaned;
          }
          
          const finalTitle = cleanTitle(pageTitle) || 'Model';
          
          // Title doğrulama ve güvenlik kontrolü
          const safeTitle = (typeof finalTitle === 'string' && finalTitle.trim()) ? 
                            finalTitle.trim() : 'Model';
          
          console.log('Background: Final title processing →', safeTitle);
          
          // Dosyayı cache'e ekle - güvenli meta object
          const fileMetadata = {
            size: fileSize || 0,
            title: safeTitle,
            timestamp: Date.now(),  // Cache yaşını takip etmek için
            url: details.url        // URL'yi de sakla
          };
          
          cache.set(details.url, fileMetadata);
          
          // Badge'i güncelle
          chrome.action.setBadgeText({
            text: String(cache.size),
            tabId: details.tabId
          });
          chrome.action.setBadgeBackgroundColor({
            color: '#4CAF50',
            tabId: details.tabId
          });
          
          // Storage'a kaydet
          chrome.storage.local.set({
            [`files_${details.tabId}`]: Array.from(cache.entries())
          });
        }).catch(err => {
          console.error('Title extraction error:', err);
          
          // Hata durumunda güvenli fallback title oluştur
          let fallbackTitle = 'Model-File';
          try {
            const urlObj = new URL(details.url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
              const lastPart = decodeURIComponent(pathParts[pathParts.length - 1]);
              // Dosya uzantısını kaldır ve temizle
              fallbackTitle = lastPart
                .replace(/\.(spz|ply|splat|gsplat|npz|html|htm|php)$/i, '')
                .replace(/[-_.]/g, ' ')
                .trim() || 'Model-File';
            }
            // Host adını ekle eğer generic bir isimse
            if (fallbackTitle === 'Model-File' || fallbackTitle.length < 4) {
              const hostname = urlObj.hostname.replace(/^www\./, '');
              fallbackTitle = hostname + ' Model';
            }
          } catch (e) {
            console.warn('URL parsing error in fallback:', e);
            fallbackTitle = 'Unknown-Model';
          }
          
          console.log('Background: Using fallback title →', fallbackTitle);
          
          // Güvenli meta object oluştur
          const fileMetadata = {
            size: fileSize || 0,
            title: fallbackTitle,
            timestamp: Date.now(),
            url: details.url,
            titleSource: 'fallback-url' // Debugging için
          };
          
          cache.set(details.url, fileMetadata);
          
          // UI güncellemeleri
          chrome.action.setBadgeText({
            text: String(cache.size),
            tabId: details.tabId
          });
          chrome.action.setBadgeBackgroundColor({
            color: '#4CAF50',
            tabId: details.tabId
          });
          
          // Storage'a güvenli şekilde kaydet
          chrome.storage.local.set({
            [`files_${details.tabId}`]: Array.from(cache.entries())
          }).catch(storageErr => {
            console.error('Storage save error:', storageErr);
          });
        });
      }
    } else {
      // Dosya tespit edilmezse, Gaussian Splatting WebP dosyalarını ara
      console.log('ℹ️ No target file detected, checking for Gaussian Splatting WebP files...');
      
      // Tab durumunu kontrol et ve güvenli scan başlat
      setTimeout(() => {
        scanForGaussianSplatting(details.tabId, details.url).catch(scanError => {
          console.warn('Gaussian scan failed safely:', scanError.message);
        });
      }, 100); // 100ms gecikme ile frame hazır olmasını bekle
    }
  },
  
  activate: () => {
    chrome.webRequest.onHeadersReceived.addListener(
      monitor.observe,
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );
    console.log('Grabby active - Monitoring network requests');
  }
};

// Eklenti yüklendiğinde monitörü başlat
chrome.runtime.onInstalled.addListener(() => {
  monitor.activate();
});

// Tab kapatıldığında önbelleği temizle
chrome.tabs.onRemoved.addListener(tabId => {
  console.log('Tab removed, cleaning cache for tabId:', tabId);
  fileCache.delete(tabId);
  chrome.storage.local.remove(`files_${tabId}`).catch(err => {
    console.warn('Error removing storage for tab:', err);
  });
});

// Tab yenilendiğinde badge'i sıfırla ve cache'i temizle
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    console.log('Tab reloading, clearing cache for tabId:', tabId);
    chrome.action.setBadgeText({ text: '', tabId });
    fileCache.delete(tabId);
    chrome.storage.local.remove(`files_${tabId}`).catch(() => {});
  }
});

// Periyodik cache temizliği - eski cache'leri temizle (1 saatlik)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;
  
  for (const [tabId, filesMap] of fileCache.entries()) {
    const filesToKeep = new Map();
    
    for (const [url, metadata] of filesMap.entries()) {
      // Timestamp varsa ve 1 saatden eskiyse sil
      if (metadata.timestamp && metadata.timestamp < oneHourAgo) {
        cleanedCount++;
      } else {
        filesToKeep.set(url, metadata);
      }
    }
    
    // Güncellenmiş map'i geri koy
    if (filesToKeep.size !== filesMap.size) {
      if (filesToKeep.size === 0) {
        fileCache.delete(tabId);
        chrome.storage.local.remove(`files_${tabId}`).catch(() => {});
      } else {
        fileCache.set(tabId, filesToKeep);
        chrome.storage.local.set({
          [`files_${tabId}`]: Array.from(filesToKeep.entries())
        }).catch(() => {});
      }
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned ${cleanedCount} old cache entries`);
  }
}, 30 * 60 * 1000); // Her 30 dakikada bir çalıştır

// İndirme dosya adı mapping - downloadId -> istenen filename
const downloadFilenames = new Map();

// İndirme dosya adını zorla değiştir
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  console.log('onDeterminingFilename - Download ID:', downloadItem.id);
  console.log('  Orijinal filename:', downloadItem.filename);
  
  const customFilename = downloadFilenames.get(downloadItem.id);
  if (customFilename) {
    console.log('  Özel filename kullanılıyor:', customFilename);
    downloadFilenames.delete(downloadItem.id); // Temizle
    suggest({ filename: customFilename, conflictAction: 'uniquify' });
    return true;
  }
  
  console.log('  Özel filename yok, orijinal kullanılıyor');
  return false;
});

// Mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Format güncellemesi geldiğinde
  if (request.cmd === 'updateFormats') {
    console.log('🔄 Updating TARGET_EXTENSIONS from popup:', request.formats);
    TARGET_EXTENSIONS = request.formats;
    console.log('✅ New TARGET_EXTENSIONS:', TARGET_EXTENSIONS);
    return;
  }
  
  // İndirme isteği geldiğinde
  if (request.cmd === 'download') {
    const { url, filename } = request;
    
    console.log('Background: İndirme isteği alındı');
    console.log('  URL:', url);
    console.log('  İstenen filename:', filename);
    
    // Doğrudan URL ile indir - SPZ özel işlemi kaldırıldı
    chrome.downloads.download({
      url: url,
      saveAs: false
    }, downloadId => {
      if (chrome.runtime.lastError) {
        console.error('  İndirme hatası:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('  Download ID:', downloadId);
        // Download ID ile filename'i eşleştir
        downloadFilenames.set(downloadId, filename);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    
    return true;
  }
  
  // SPZ2PLY durumu sorgulama
  if (request.cmd === 'checkSpz2plyStatus') {
    // spz2ply klasörünün durumunu kontrol et
    chrome.runtime.sendNativeMessage('com.grabby.filemanager', {
      action: 'checkSpz2ply'
    }, response => {
      if (chrome.runtime.lastError) {
        sendResponse({ 
          available: false, 
          error: 'Native host bağlantı hatası'
        });
      } else {
        sendResponse(response);
      }
    });
    return true;
  }
});