'use strict';

// Arayüz elementleri
const formatList = document.getElementById('formatList');
const newFormatInput = document.getElementById('newFormat');
const addFormatButton = document.getElementById('addFormat');
const saveMessage = document.getElementById('saveMessage');

// Varsayılan formatlar
const DEFAULT_FORMATS = ['.spz', '.ply', '.splat', '.gsplat', '.npz'];

// Format listesini göster
async function displayFormats() {
  const { formats = DEFAULT_FORMATS } = await chrome.storage.sync.get('formats');
  
  formatList.innerHTML = formats.map(format => `
    <div class="format-item">
      ${format}
      <button data-format="${format}" class="remove-format">×</button>
    </div>
  `).join('');
}

// Formatları kaydet
async function saveFormats(formats) {
  await chrome.storage.sync.set({ formats });
  // Değişiklikleri background script'e bildir
  chrome.runtime.sendMessage({ cmd: 'updateFormats', formats });
  
  // Kayıt mesajını göster
  saveMessage.style.display = 'block';
  setTimeout(() => {
    saveMessage.style.display = 'none';
  }, 2000);
}

// Yeni format ekle
addFormatButton.addEventListener('click', async () => {
  const format = newFormatInput.value.trim().toLowerCase();
  
  // Format geçerliliğini kontrol et
  if (!/^\.[a-zA-Z0-9]+$/.test(format)) {
    alert('Lütfen geçerli bir format girin (örn: .spz)');
    return;
  }
  
  // Mevcut formatları al
  const { formats = DEFAULT_FORMATS } = await chrome.storage.sync.get('formats');
  
  // Format zaten varsa ekleme
  if (formats.includes(format)) {
    alert('Bu format zaten ekli!');
    return;
  }
  
  // Yeni formatı ekle ve kaydet
  const newFormats = [...formats, format].sort();
  await saveFormats(newFormats);
  
  // Listeyi güncelle ve input'u temizle
  displayFormats();
  newFormatInput.value = '';
});

// Format silme
formatList.addEventListener('click', async e => {
  const removeButton = e.target.closest('.remove-format');
  if (!removeButton) return;
  
  const formatToRemove = removeButton.dataset.format;
  const { formats = DEFAULT_FORMATS } = await chrome.storage.sync.get('formats');
  
  // En az bir format kalmalı
  if (formats.length <= 1) {
    alert('En az bir format kalmalı!');
    return;
  }
  
  // Formatı sil ve kaydet
  const newFormats = formats.filter(f => f !== formatToRemove);
  await saveFormats(newFormats);
  
  // Listeyi güncelle
  displayFormats();
});

// Sayfa yüklendiğinde formatları göster
document.addEventListener('DOMContentLoaded', displayFormats);