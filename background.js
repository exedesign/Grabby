'use strict';

// Varsayılan formatlar
const DEFAULT_FORMATS = ['.spz', '.ply', '.splat', '.gsplat', '.npz'];

// Aktif dosya uzantıları
let TARGET_EXTENSIONS = [...DEFAULT_FORMATS];

// Tab başına bulunan dosyaları tutmak için hafıza
const fileCache = new Map(); // tabId -> Set<url>

// Formatları storage'dan yükle
chrome.storage.sync.get('formats', ({ formats }) => {
  if (formats) {
    TARGET_EXTENSIONS = formats;
  }
});

// Bir dosyanın hedef uzantılardan birine sahip olup olmadığını kontrol et
function isTargetFile(url, disposition) {
  if (!url) return false;
  
  // Content-Disposition başlığından dosya adını kontrol et
  if (disposition) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (matches && matches.length) {
      const filename = matches[1].replace(/['"]/g, '').toLowerCase();
      if (TARGET_EXTENSIONS.some(ext => filename.endsWith(ext))) {
        return true;
      }
    }
  }
  
  // URL'yi kontrol et (sorgu parametrelerini temizleyerek)
  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  return TARGET_EXTENSIONS.some(ext => cleanUrl.endsWith(ext));
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

    if (isTargetFile(details.url, disposition?.value)) {
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
        // Önce sayfa başlığını al - Gelişmiş title extraction
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          function: () => {
            // Meta property'leri analiz et ve en uygun title'ı bul
            function extractTitle() {
              const results = [];
              
              // 1. Open Graph Protocol (Facebook, LinkedIn vb.)
              const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
              if (ogTitle?.trim()) {
                results.push({ source: 'og:title', title: ogTitle.trim(), priority: 10 });
              }
              
              // 2. Twitter Card
              const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;
              if (twitterTitle?.trim()) {
                results.push({ source: 'twitter:title', title: twitterTitle.trim(), priority: 9 });
              }
              
              // 3. Schema.org name
              const schemaName = document.querySelector('meta[itemprop="name"]')?.content;
              if (schemaName?.trim()) {
                results.push({ source: 'schema:name', title: schemaName.trim(), priority: 8 });
              }
              
              // 4. DC (Dublin Core) title
              const dcTitle = document.querySelector('meta[name="DC.title"]')?.content ||
                            document.querySelector('meta[name="dc.title"]')?.content;
              if (dcTitle?.trim()) {
                results.push({ source: 'DC.title', title: dcTitle.trim(), priority: 7 });
              }
              
              // 5. Apple mobile web app title
              const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content;
              if (appleTitle?.trim()) {
                results.push({ source: 'apple-title', title: appleTitle.trim(), priority: 6 });
              }
              
              // 6. Application name
              const appName = document.querySelector('meta[name="application-name"]')?.content;
              if (appName?.trim()) {
                results.push({ source: 'app-name', title: appName.trim(), priority: 5 });
              }
              
              // 7. Custom data attributes (bazı siteler data-title kullanır)
              const dataTitle = document.querySelector('[data-page-title]')?.getAttribute('data-page-title') ||
                               document.querySelector('[data-title]')?.getAttribute('data-title');
              if (dataTitle?.trim()) {
                results.push({ source: 'data-title', title: dataTitle.trim(), priority: 4 });
              }
              
              // 8. H1 heading (genellikle ana başlık)
              const h1Text = document.querySelector('h1')?.textContent?.trim();
              if (h1Text && h1Text.length < 200) { // Çok uzun h1'leri atla
                results.push({ source: 'h1', title: h1Text, priority: 3 });
              }
              
              // 9. Document title
              if (document.title?.trim()) {
                results.push({ source: 'document.title', title: document.title.trim(), priority: 2 });
              }
              
              // 10. URL pathname (son çare)
              const pathname = window.location.pathname.split('/').filter(p => p).pop();
              if (pathname) {
                const urlTitle = decodeURIComponent(pathname).replace(/[-_]/g, ' ');
                results.push({ source: 'url', title: urlTitle, priority: 1 });
              }
              
              // En yüksek priority'ye sahip olan + en kısa ve anlamlı olanı seç
              if (results.length > 0) {
                // Priority'ye göre sırala, sonra uzunluğa göre (kısa tercih)
                results.sort((a, b) => {
                  if (b.priority !== a.priority) return b.priority - a.priority;
                  return a.title.length - b.title.length;
                });
                
                const selected = results[0];
                console.log('🎯 Grabby - Title extraction results:');
                console.log('  All candidates:', results.map(r => `[${r.priority}] ${r.source}: ${r.title.substring(0, 50)}`));
                console.log('  ✅ Selected:', selected.source, '→', selected.title);
                
                return selected.title;
              }
              
              // Hiçbir şey bulunamazsa
              console.log('⚠️ No title found, using hostname');
              return window.location.hostname + '-model';
            }
            
            return extractTitle();
          }
        }).then(([{result: pageTitle}]) => {
          console.log('Background: Title extracted →', pageTitle);
          
          // Title'ı temizle ve normalize et
          function cleanTitle(title) {
            if (!title) return 'model';
            
            // Gereksiz site adlarını ve ayraçları temizle
            let cleaned = title;
            
            // " - Site Name", " | Site Name", " :: Site Name" gibi kısımları kaldır
            cleaned = cleaned.split(/\s*[-–—|::•]\s*(?=[A-Z])/)[0]; 
            
            // Başta/sonda boşlukları temizle
            cleaned = cleaned.trim();
            
            // Eğer çok kısa kaldıysa orijinali kullan
            if (cleaned.length < 5 && title.length > 5) {
              cleaned = title;
            }
            
            // Çok uzun başlıkları kısalt (ilk 100 karakter)
            if (cleaned.length > 100) {
              cleaned = cleaned.substring(0, 100).trim();
            }
            
            console.log('  Cleaned title:', cleaned);
            return cleaned;
          }
          
          const finalTitle = cleanTitle(pageTitle) || 'model';
          
          // Dosyayı cache'e ekle
          cache.set(details.url, {
            size: fileSize,
            title: finalTitle
          });
          
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
          // Hata durumunda URL'den bir başlık oluştur
          const urlPath = new URL(details.url).pathname;
          const urlTitle = urlPath.split('/').filter(p => p).pop()?.replace(/[-_.]/g, ' ') || 'model-file';
          
          cache.set(details.url, {
            size: fileSize,
            title: urlTitle
          });
          
          chrome.action.setBadgeText({
            text: String(cache.size),
            tabId: details.tabId
          });
          chrome.action.setBadgeBackgroundColor({
            color: '#4CAF50',
            tabId: details.tabId
          });
          
          chrome.storage.local.set({
            [`files_${details.tabId}`]: Array.from(cache.entries())
          });
        });
      }
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
  fileCache.delete(tabId);
  chrome.storage.local.remove(`files_${tabId}`);
});

// Tab yenilendiğinde badge'i sıfırla
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId });
    fileCache.delete(tabId);
  }
});

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
    TARGET_EXTENSIONS = request.formats;
    return;
  }
  
  // İndirme isteği geldiğinde
  if (request.cmd === 'download') {
    const { url, filename } = request;
    
    console.log('Background: İndirme isteği alındı');
    console.log('  URL:', url);
    console.log('  İstenen filename:', filename);
    
    // Doğrudan URL ile indir
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
});