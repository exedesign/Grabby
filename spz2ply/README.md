# 🚀 SPZ2PLY Otomatik Dönüştürücü

**Basit • Hızlı • Sezgisel**

SPZ dosyalarını PLY formatına otomatik olarak dönüştüren kullanımı kolay araç.

## ✨ Özellikler

- 🎯 **Sezgisel Kullanım**: Dosyaları `import` klasörüne atın, `run.bat`'a tıklayın
- 📁 **Otomatik Klasör Yönetimi**: `import` ve `export` klasörleri otomatik oluşturulur
- 🔄 **Toplu Dönüştürme**: Bir seferde birden fazla dosya işlenir
- 📊 **İlerleme Takibi**: Her dosya için ayrıntılı durum raporu
- ✅ **Gereksinim Kontrolü**: Sistem otomatik olarak kontrol edilir
- 🌈 **Renkli Çıktı**: Görsel olarak net ve anlaşılır mesajlar

## 🛠️ Kurulum

### 1. Gereksinimler
- **Node.js** (LTS sürümü önerilir)
  - İndirin: [https://nodejs.org](https://nodejs.org)

### 2. Kurulum Adımları

#### Otomatik Kurulum (Önerilen)
```bash
# Windows için
setup-new.bat
```

#### Manuel Kurulum
```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Klasörleri oluştur
mkdir import export
```

## 🎮 Kullanım

### Basit Kullanım (Önerilen)
1. **SPZ dosyalarınızı** `import/` klasörüne kopyalayın
2. **`run.bat`** dosyasına çift tıklayın
3. **Dönüştürülen PLY dosyaları** `export/` klasöründe hazır!

### Komut Satırı Kullanımı
```bash
# Otomatik dönüştürme (tüm dosyalar)
node auto-convert.js

# Manuel dönüştürme (tek dosya)
node convert.js input/dosya.spz export/dosya.ply
```

## 📁 Klasör Yapısı

```
spz2ply/
├── import/          # SPZ dosyalarınızı buraya koyun
├── export/          # Dönüştürülen PLY dosyaları burada
├── auto-convert.js  # Ana dönüştürme scripti
├── run.bat         # Windows için kolay çalıştırma
├── setup-new.bat   # Otomatik kurulum scripti
└── package.json    # Node.js bağımlılıkları
```

## 🔧 Çalışma Mantığı

1. **Sistem Kontrolü**: Node.js ve bağımlılıklar kontrol edilir
2. **Klasör Hazırlığı**: `import` ve `export` klasörleri oluşturulur
3. **Dosya Tarama**: `import` klasöründeki SPZ dosyaları bulunur
4. **Dönüştürme**: Her dosya tek tek PLY formatına çevrilir
5. **Rapor**: İşlem sonucu detaylı rapor gösterilir

## 📊 Çıktı Örneği

```
🚀 SPZ2PLY Otomatik Dönüştürücü
   Basit • Hızlı • Sezgisel

🔍 Gereksinimler kontrol ediliyor...
   Node.js: v18.17.0
   spz-js: ^1.2.5
   ✅ Tüm gereksinimler karşılanmış

📁 Klasör yapısı hazırlanıyor...
   ✅ "import" klasörü mevcut
   ✅ "export" klasörü mevcut

🔎 Dosyalar taranıyor...
   📄 model1.spz (2.5 MB)
   📄 model2.spz (1.8 MB)
   ✅ 2 adet dosya bulundu

🔄 2 dosya dönüştürülüyor...
[1/2] model1.spz → model1.ply
   ✅ Başarılı (3.2 MB)
[2/2] model2.spz → model2.ply
   ✅ Başarılı (2.4 MB)

📊 İşlem Özeti:
   ✅ Başarılı: 2
   📁 Çıktı klasörü: ./export

🎉 İşlem tamamlandı!
```

## ❗ Sorun Giderme

### Node.js Bulunamadı
```bash
❌ Node.js bulunamadı!
💡 Node.js'i yükleyin: https://nodejs.org
```
**Çözüm**: Node.js'i resmi siteden indirip kurun.

### Paket Kurulum Hatası
```bash
❌ spz-js paketi kurulu değil!
💡 Çözüm: npm install komutunu çalıştırın
```
**Çözüm**: İnternet bağlantınızı kontrol edin, `npm install` çalıştırın.

### Dosya Bulunamadı
```bash
⚠️ "import" klasöründe desteklenen dosya bulunamadı
💡 Desteklenen formatlar: .spz
```
**Çözüm**: SPZ dosyalarınızı `import/` klasörüne kopyalayın.

## 🔄 Güncelleme

```bash
# Bağımlılıkları güncelle
npm update

# Yeni sürümü kontrol et
npm outdated
```

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch'i oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

---

**💡 İpucu**: İlk kullanımda `setup-new.bat` çalıştırarak otomatik kurulum yapın!