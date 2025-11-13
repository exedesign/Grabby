'use strict';

const fileList = document.getElementById('fileList');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeBtn = document.getElementById('closeBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const activeFormatsList = document.getElementById('activeFormatsList');
const newFormatInput = document.getElementById('newFormatInput');
const addFormatBtn = document.getElementById('addFormatBtn');
const saveMessage = document.getElementById('saveMessage');
const formatsList = document.getElementById('formatsList');
const languageSelect = document.getElementById('languageSelect');

const DEFAULT_FORMATS = ['.spz', '.ply', '.splat', '.gsplat', '.npz'];

// Initialize i18n
async function initializeI18n() {
  const { language } = await chrome.storage.sync.get('language');
  if (language && typeof setLanguage === 'function') {
    setLanguage(language);
    languageSelect.value = language;
  }
  updateUIText();
}

// Update all UI text with current language
function updateUIText() {
  // Check if i18n is loaded
  if (typeof t !== 'function') {
    console.error('i18n not loaded yet, retrying...');
    setTimeout(updateUIText, 100);
    return;
  }
  
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) {
      el.textContent = translation;
    }
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation) {
      el.placeholder = translation;
    }
  });
  
  // Update titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translation = t(key);
    if (translation) {
      el.title = translation;
    }
  });
}

// Language selector change event
languageSelect.addEventListener('change', async function() {
  const newLang = languageSelect.value;
  if (typeof setLanguage === 'function') {
    setLanguage(newLang);
    await chrome.storage.sync.set({ language: newLang });
    updateUIText();
    // Reload files to update button text
    showFiles();
    displayActiveFormats();
    showSaveMessage();
  }
});

settingsBtn.addEventListener('click', function() {
  settingsModal.classList.add('show');
  displayActiveFormats();
});

closeBtn.addEventListener('click', function() {
  settingsModal.classList.remove('show');
});

closeModalBtn.addEventListener('click', function() {
  settingsModal.classList.remove('show');
});

settingsModal.addEventListener('click', function(e) {
  if (e.target === settingsModal) settingsModal.classList.remove('show');
});

async function displayActiveFormats() {
  const x = await chrome.storage.sync.get('formats');
  const formats = x.formats || DEFAULT_FORMATS;
  const deleteText = typeof t === 'function' ? t('delete') : 'Delete';
  activeFormatsList.innerHTML = formats.map(function(f) {
    return '<div class="format-item"><span>' + f + '</span><button class="delete-format" data-format="' + f + '">' + deleteText + '</button></div>';
  }).join('');
  activeFormatsList.querySelectorAll('.delete-format').forEach(function(btn) {
    btn.addEventListener('click', function() {
      deleteFormat(btn.dataset.format);
    });
  });
}

addFormatBtn.addEventListener('click', async function() {
  const fmt = newFormatInput.value.trim().toLowerCase();
  if (!/^\.[a-zA-Z0-9]+$/.test(fmt)) {
    alert(typeof t === 'function' ? t('invalidFormat') : 'Please enter a valid format (e.g. .spz)');
    return;
  }
  const x = await chrome.storage.sync.get('formats');
  const formats = x.formats || DEFAULT_FORMATS;
  if (formats.includes(fmt)) {
    alert(typeof t === 'function' ? t('formatExists') : 'This format already exists!');
    return;
  }
  const newFormats = formats.concat([fmt]).sort();
  await chrome.storage.sync.set({formats: newFormats});
  chrome.runtime.sendMessage({cmd: 'updateFormats', formats: newFormats});
  newFormatInput.value = '';
  await displayActiveFormats();
  showSaveMessage();
  displayFormatsInPopup(newFormats);
});

async function deleteFormat(format) {
  const x = await chrome.storage.sync.get('formats');
  const formats = x.formats || DEFAULT_FORMATS;
  if (formats.length <= 1) {
    alert(typeof t === 'function' ? t('minOneFormat') : 'At least one format is required!');
    return;
  }
  const newFormats = formats.filter(function(f) {return f !== format;});
  await chrome.storage.sync.set({formats: newFormats});
  chrome.runtime.sendMessage({cmd: 'updateFormats', formats: newFormats});
  await displayActiveFormats();
  showSaveMessage();
  displayFormatsInPopup(newFormats);
}

function showSaveMessage() {
  saveMessage.style.display = 'block';
  setTimeout(function() {
    saveMessage.style.display = 'none';
  }, 2000);
}

async function displayFormatsInPopup(formats) {
  const fmt = formats || (await chrome.storage.sync.get('formats')).formats || DEFAULT_FORMATS;
  formatsList.innerHTML = fmt.map(function(f) {return '<span class="format-tag">' + f + '</span>';}).join('');
}

async function showFiles() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tabs || tabs.length === 0) return;
  const tab = tabs[0];
  const key = 'files_' + tab.id;
  const data = await chrome.storage.local.get(key);
  const files = data[key] || [];
  
  const noFilesText = typeof t === 'function' ? t('noFiles') : 'No files found';
  const noFilesDescText = typeof t === 'function' ? t('noFilesDesc') : 'Files will be scanned when page reloads.';
  const sizeUnknownText = typeof t === 'function' ? t('sizeUnknown') : 'Unknown';
  const downloadText = typeof t === 'function' ? t('download') : 'Download';
  
  if (files.length === 0) {
    fileList.innerHTML = '<div class="no-files"><span>' + noFilesText + '</span><br><span style="font-size: 11px; color: #555;">' + noFilesDescText + '</span></div>';
    return;
  }

  // Gaussian Splatting dosyalarını tespit et ve grupla
  const gaussianFiles = [];
  const regularFiles = [];
  const GAUSSIAN_WEBP_FILES = ['means_l.webp', 'means_u.webp', 'scales.webp', 'quats.webp', 'sh0.webp', 'shN_centroids.webp', 'shN_labels.webp', 'meta.json'];
  
  files.forEach(function(item) {
    const url = item[0];
    const meta = item[1];
    const fileName = new URL(url).pathname.split('/').pop().toLowerCase();
    
    // Gaussian Splatting dosyası mı kontrol et (meta.json için özel kontrol dahil)
    const isGaussianFile = GAUSSIAN_WEBP_FILES.some(function(gaussianFileName) {
      return fileName.includes(gaussianFileName) || fileName === gaussianFileName;
    }) || (fileName.includes('meta') && fileName.includes('.json')) ||
       (fileName.includes('sh') && fileName.includes('.webp')); // shN dosyaları için genel pattern
    
    console.log('File check:', fileName, 'isGaussian:', isGaussianFile);
    
    if (isGaussianFile) {
      gaussianFiles.push({
        url: url,
        filename: fileName,
        size: meta.size || 0
      });
    } else if (meta && meta.isGaussianProject) {
      // Background.js'ten gelen hazır proje
      regularFiles.push(item);
    } else {
      regularFiles.push(item);
    }
  });

  let html = '';
  
  // Gaussian Splatting dosyaları varsa tek proje olarak göster
  if (gaussianFiles.length > 0) {
    // Sayfa başlığını al
    let projectTitle = 'Gaussian Splatting Model';
    try {
      const pageTitle = document.title || tab.title;
      if (pageTitle && pageTitle.trim() && pageTitle.toLowerCase() !== 'untitled') {
        projectTitle = pageTitle.trim();
      }
    } catch (e) {
      console.log('Could not get page title:', e);
    }
    
    const totalSizeMB = (gaussianFiles.length * 1.2).toFixed(1); // Ortalama dosya boyutu tahmini
    const virtualUrl = 'gaussian-project://' + tab.url;
    
    html += '<div class="file-item gaussian-project" style="background: linear-gradient(135deg, #1a3a1a 0%, #244424 100%); border-left: 3px solid #4CAF50;">' +
      '<div class="file-info">' +
      '<div class="file-name" title="' + projectTitle + '">🎯 ' + projectTitle + '</div>' +
      '<div class="file-size">' + gaussianFiles.length + ' dosya (~' + totalSizeMB + ' MB)</div>' +
      '<div style="font-size: 11px; color: #81C784;">Gaussian Splatting WebP Files</div>' +
      '</div>' +
      '<button class="download-btn gaussian-download" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);" data-url="' + virtualUrl + '" data-title="' + projectTitle + '" data-project="true" data-files="' + encodeURIComponent(JSON.stringify(gaussianFiles)) + '">' + downloadText + '</button>' +
      '</div>';
  }

  // Normal dosyalar göster
  html += regularFiles.map(function(item) {
    const url = item[0];
    const meta = item[1];
    const fname = new URL(url).pathname.split('/').pop();
    const sz = meta.size;
    const sz_str = sz > 0 ? (sz / 1048576).toFixed(1) + ' MB' : sizeUnknownText;
    const title = meta.title && meta.title.trim() ? meta.title.trim() : 'Model-File';
    
    return '<div class="file-item">' +
      '<div class="file-info">' +
      '<div class="file-name" title="' + title + '">📁 ' + fname + '</div>' +
      '<div class="file-size">' + sz_str + '</div>' +
      '</div>' +
      '<button class="download-btn" data-url="' + url + '" data-title="' + title + '">' + downloadText + '</button>' +
      '</div>';
  }).join('');

  fileList.innerHTML = html;
}

fileList.addEventListener('click', function(e) {
  const button = e.target.closest('.download-btn');
  if (!button) return;
  
  const url = button.dataset.url;
  const title = button.dataset.title || 'Model-File';
  const isProject = button.dataset.project === 'true';
  
  console.log('Download info:', {url: url, title: title, isProject: isProject});
  
  if (isProject) {
    // Gaussian Splatting projesi indirme
    downloadGaussianProject(url, title, button);
  } else {
    // Normal dosya indirme
    downloadSingleFile(url, title, button);
  }
});

// Gaussian Splatting projesi indirme fonksiyonu
async function downloadGaussianProject(virtualUrl, projectTitle, button) {
  console.log('🎯 Starting Gaussian Project download:', projectTitle);
  
  let gaussianFiles = [];
  
  // data-files attribute'undan dosya listesini al
  if (button.dataset.files) {
    try {
      gaussianFiles = JSON.parse(decodeURIComponent(button.dataset.files));
    } catch (e) {
      console.error('Could not parse files data:', e);
    }
  }
  
  // Eğer data-files yoksa, eski yöntemle storage'dan al
  if (gaussianFiles.length === 0) {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || tabs.length === 0) return;
    
    const tab = tabs[0];
    const key = 'files_' + tab.id;
    const data = await chrome.storage.local.get(key);
    const files = data[key] || [];
    
    const projectData = files.find(function(item) { return item[0] === virtualUrl; });
    if (projectData && projectData[1] && projectData[1].files) {
      gaussianFiles = projectData[1].files;
    }
  }
  
  if (gaussianFiles.length === 0) {
    console.error('No Gaussian files found!');
    return;
  }
  
  const safeProjectTitle = createSafeFilename(projectTitle);
  const date = new Date().toISOString().slice(0, 10);
  const folderName = safeProjectTitle + '-' + date;
  
  console.log('📦 Downloading ' + gaussianFiles.length + ' files to folder: ' + folderName);
  
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = '📦 İndiriliyor... (0/' + gaussianFiles.length + ')';
  
  let downloadedCount = 0;
  
  for (let i = 0; i < gaussianFiles.length; i++) {
    const file = gaussianFiles[i];
    const fullPath = folderName + '/' + file.filename;
    
    try {
      await new Promise(function(resolve, reject) {
        chrome.runtime.sendMessage({
          cmd: 'download', 
          url: file.url, 
          filename: fullPath
        }, function(resp) {
          downloadedCount++;
          button.textContent = '📦 İndiriliyor... (' + downloadedCount + '/' + gaussianFiles.length + ')';
          
          if (resp && resp.success) {
            console.log('✅ Downloaded: ' + file.filename);
            resolve();
          } else {
            reject(new Error(resp ? resp.error : 'İndirme hatası'));
          }
        });
      });
      
      // Kısa bekleme süresi
      await new Promise(function(resolve) { setTimeout(resolve, 300); });
      
    } catch (e) {
      console.error('Dosya indirme hatası:', file.filename, e);
    }
  }
  
  button.textContent = '✅ Tamamlandı (' + downloadedCount + '/' + gaussianFiles.length + ')';
  setTimeout(function() {
    button.textContent = originalText;
    button.disabled = false;
  }, 3000);
}

// Normal dosya indirme fonksiyonu
function downloadSingleFile(url, title, button) {
  const urlPath = new URL(url).pathname;
  const ext = (urlPath.match(/\.[^.]+$/) || ['.spz'])[0].toLowerCase();
  
  console.log('Download info:');
  console.log('  URL:', url);
  console.log('  Title (data-title):', title);
  console.log('  Extension:', ext);
  
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = createSafeFilename(title);
  const filename = safeTitle + '-' + date + ext;
  
  console.log('  Safe title:', safeTitle);
  console.log('  Date:', date);
  console.log('  Final filename:', filename);
  
  button.disabled = true;
  button.textContent = typeof t === 'function' ? t('downloading') : 'Downloading...';
  
  const downloadMessage = {
    cmd: 'download', 
    url: url, 
    filename: filename
  };
  
  console.log('  Message sent to Chrome:', downloadMessage);
  
  chrome.runtime.sendMessage(downloadMessage, function(resp) {
    console.log('  Download response:', resp);
    
    const downloadedText = typeof t === 'function' ? t('downloaded') : 'Downloaded ✓';
    const errorText = typeof t === 'function' ? t('error') : 'Error!';
    const downloadText = typeof t === 'function' ? t('download') : 'Download';
    
    if (resp && resp.success) {
      button.textContent = downloadedText;
      setTimeout(function() {
        button.textContent = downloadText;
        button.disabled = false;
      }, 3000);
    } else {
      button.textContent = errorText;
      setTimeout(function() {
        button.textContent = downloadText;
        button.disabled = false;
      }, 2000);
    }
  });
}

// Güvenli dosya adı oluşturma fonksiyonu
function createSafeFilename(text) {
  if (!text) return 'file';
  let result = text;
  // Türkçe karakterleri dönüştür
  result = result.replace(/ğ/g, 'g').replace(/Ğ/g, 'G');
  result = result.replace(/ı/g, 'i').replace(/İ/g, 'I');
  result = result.replace(/ş/g, 's').replace(/Ş/g, 'S');
  result = result.replace(/ç/g, 'c').replace(/Ç/g, 'C');
  result = result.replace(/ö/g, 'o').replace(/Ö/g, 'O');
  result = result.replace(/ü/g, 'u').replace(/Ü/g, 'U');
  // Boşluk ve noktalari tire yap
  result = result.replace(/[\s.]+/g, '-');
  // Özel karakterleri kaldır
  result = result.replace(/[&+$,/:;=?@"'<>#%{}|^~[\]`\\()]/g, '');
  // Unicode normalizasyon
  result = result.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  // Sadece alfanumerik ve tire
  result = result.replace(/[^a-zA-Z0-9-_]/g, '-');
  // Çoklu tireleri tek tire yap
  result = result.replace(/-+/g, '-');
  // Baştaki ve sondaki tireleri kaldır
  result = result.replace(/^-+|-+$/g, '');
  // Küçük harfe çevir
  result = result.toLowerCase();
  // Maksimum 150 karakter
  result = result.slice(0, 150);
  return result || 'file';
}

document.addEventListener('DOMContentLoaded', function() {
  initializeI18n().then(() => {
    showFiles();
    displayFormatsInPopup();
  });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local') showFiles();
  if (namespace === 'sync') displayFormatsInPopup();
});
