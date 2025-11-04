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
        // Önce sayfa başlığını al
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          function: () => {
            // Sırayla tüm olası başlık kaynaklarını kontrol et
            const sources = [
              // Open Graph başlığı
              () => document.querySelector('meta[property="og:title"]')?.content,
              // Twitter başlığı
              () => document.querySelector('meta[name="twitter:title"]')?.content,
              // Diyalog başlıkları
              () => document.querySelector('.dialog-title, .modal-title, [role="dialog"] h1, [role="dialog"] h2')?.textContent,
              // Ana başlık
              () => document.querySelector('h1')?.textContent,
              // Sayfa başlığı
              () => document.title,
              // Meta description
              () => document.querySelector('meta[name="description"]')?.content
            ];

            // İlk bulunan geçerli başlığı döndür
            for (const getTitle of sources) {
              try {
                const title = getTitle();
                if (title && title.trim() && title.trim().length > 0) {
                  console.log('Bulunan başlık:', title.trim());
                  return title.trim();
                }
              } catch(e) {}
            }
            console.log('Başlık bulunamadı, URL kullanılacak');
            return window.location.hostname + '-model';
          }
        }).then(([{result: pageTitle}]) => {
          console.log('Background: Başlık alındı:', pageTitle);
          
          // Dosyayı cache'e ekle
          cache.set(details.url, {
            size: fileSize,
            title: pageTitle || 'model'
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
          console.error('Title extraction hatası:', err);
          // Hata durumunda yine de dosyayı kaydet
          cache.set(details.url, {
            size: fileSize,
            title: 'model-dosya'
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