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
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  
  // Update titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
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
  activeFormatsList.innerHTML = formats.map(function(f) {
    return '<div class="format-item"><span>' + f + '</span><button class="delete-format" data-format="' + f + '">' + t('delete') + '</button></div>';
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
    alert(t('invalidFormat'));
    return;
  }
  const x = await chrome.storage.sync.get('formats');
  const formats = x.formats || DEFAULT_FORMATS;
  if (formats.includes(fmt)) {
    alert(t('formatExists'));
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
    alert(t('minOneFormat'));
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
  
  if (files.length === 0) {
    fileList.innerHTML = '<div class="no-files"><span>' + t('noFiles') + '</span><br><span style="font-size: 11px; color: #555;">' + t('noFilesDesc') + '</span></div>';
    return;
  }

  fileList.innerHTML = files.map(function(item) {
    const url = item[0];
    const meta = item[1];
    const fname = new URL(url).pathname.split('/').pop();
    const sz = meta.size;
    const sz_str = sz > 0 ? (sz / 1048576).toFixed(1) + ' MB' : t('sizeUnknown');
    // Title ZORUNLU - eğer yoksa varsayılan kullan
    const title = meta.title && meta.title.trim() ? meta.title.trim() : 'Model-File';
    console.log('Popup gösterimi - URL:', url, 'Title:', title);
    return '<div class="file-item"><div class="file-info"><div class="file-name" title="' + title + '">' + title + '</div><div class="file-size">' + sz_str + '</div></div><button class="download-btn" data-url="' + url + '" data-title="' + title + '">' + t('download') + '</button></div>';
  }).join('');
}

fileList.addEventListener('click', function(e) {
  const button = e.target.closest('.download-btn');
  if (!button) return;
  
  const url = button.dataset.url;
  // Title'ı button'ın data attribute'undan al - DOM'dan değil
  const title = button.dataset.title || 'Model-File';
  const urlPath = new URL(url).pathname;
  const ext = (urlPath.match(/\.[^.]+$/) || ['.spz'])[0].toLowerCase();
  
  console.log('Download info:');
  console.log('  URL:', url);
  console.log('  Title (data-title):', title);
  console.log('  Extension:', ext);
  
  // Güvenli dosya adı oluştur - Türkçe karakterleri dönüştür
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
  
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = createSafeFilename(title);
  const filename = safeTitle + '-' + date + ext;
  
  console.log('  Safe title:', safeTitle);
  console.log('  Date:', date);
  console.log('  Final filename:', filename);
  console.log('  Message sent to Chrome:', {cmd: 'download', url: url, filename: filename});
  
  button.disabled = true;
  button.textContent = t('downloading');
  
  chrome.runtime.sendMessage({cmd: 'download', url: url, filename: filename}, function(resp) {
    console.log('  Download response:', resp);
    if (resp && resp.success) {
      button.textContent = t('downloaded');
      setTimeout(function() {
        button.textContent = t('download');
        button.disabled = false;
      }, 2000);
    } else {
      button.textContent = t('error');
      setTimeout(function() {
        button.textContent = t('download');
        button.disabled = false;
      }, 2000);
    }
  });
});

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

settingsBtn.addEventListener('click', function() {
  settingsModal.classList.add('show');
  displayActiveFormats();
});

closeBtn.addEventListener('click', function() {
  settingsModal.classList.remove('show');
});

settingsModal.addEventListener('click', function(e) {
  if (e.target === settingsModal) settingsModal.classList.remove('show');
});

async function displayActiveFormats() {
  const x = await chrome.storage.sync.get('formats');
  const formats = x.formats || DEFAULT_FORMATS;
  activeFormatsList.innerHTML = formats.map(function(f) {
    return '<div class="format-item"><span>' + f + '</span><button class="delete-format" data-format="' + f + '">Delete</button></div>';
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
    alert('Please enter a valid format (e.g. .spz)');
    return;
  }
  const x = await chrome.storage.sync.get('formats');
  const formats = x.formats || DEFAULT_FORMATS;
  if (formats.includes(fmt)) {
    alert('This format already exists!');
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
    alert('At least one format is required!');
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
  
  if (files.length === 0) {
    fileList.innerHTML = '<div class="no-files">No files found</div>';
    return;
  }

  fileList.innerHTML = files.map(function(item) {
    const url = item[0];
    const meta = item[1];
    const fname = new URL(url).pathname.split('/').pop();
    const sz = meta.size;
    const sz_str = sz > 0 ? (sz / 1048576).toFixed(1) + ' MB' : 'Unknown';
    // Title ZORUNLU - eğer yoksa varsayılan kullan
    const title = meta.title && meta.title.trim() ? meta.title.trim() : 'Model-File';
    console.log('Popup gösterimi - URL:', url, 'Title:', title);
    return '<div class="file-item"><div class="file-info"><div class="file-name" title="' + title + '">' + title + '</div><div class="file-size">' + sz_str + '</div></div><button class="download-btn" data-url="' + url + '" data-title="' + title + '">Download</button></div>';
  }).join('');
}

fileList.addEventListener('click', function(e) {
  const button = e.target.closest('.download-btn');
  if (!button) return;
  
  const url = button.dataset.url;
  // Title'ı button'ın data attribute'undan al - DOM'dan değil
  const title = button.dataset.title || 'Model-File';
  const urlPath = new URL(url).pathname;
  const ext = (urlPath.match(/\.[^.]+$/) || ['.spz'])[0].toLowerCase();
  
  console.log('Download info:');
  console.log('  URL:', url);
  console.log('  Title (data-title):', title);
  console.log('  Extension:', ext);
  
  // Güvenli dosya adı oluştur - Türkçe karakterleri dönüştür
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
  
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = createSafeFilename(title);
  const filename = safeTitle + '-' + date + ext;
  
  console.log('  Safe title:', safeTitle);
  console.log('  Date:', date);
  console.log('  Final filename:', filename);
  console.log('  Message sent to Chrome:', {cmd: 'download', url: url, filename: filename});
  
  button.disabled = true;
  button.textContent = 'Downloading...';
  
  chrome.runtime.sendMessage({cmd: 'download', url: url, filename: filename}, function(resp) {
    console.log('  Download response:', resp);
    if (resp && resp.success) {
      button.textContent = 'Downloaded ✓';
      setTimeout(function() {
        button.textContent = 'Download';
        button.disabled = false;
      }, 2000);
    } else {
      button.textContent = 'Error!';
      setTimeout(function() {
        button.textContent = 'Download';
        button.disabled = false;
      }, 2000);
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  showFiles();
  displayFormatsInPopup();
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local') showFiles();
  if (namespace === 'sync') displayFormatsInPopup();
});
