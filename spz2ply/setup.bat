@echo off
chcp 65001 >nul
title SPZ2PLY Kurulum

echo.
echo 🛠️  SPZ2PLY Otomatik Dönüştürücü - Kurulum
echo.

REM Node.js kontrolü
echo 🔍 Gereksinimler kontrol ediliyor...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js bulunamadı!
    echo.
    echo 📋 Kurulum Talimatları:
    echo    1. https://nodejs.org adresine gidin
    echo    2. LTS sürümünü indirin ve kurun
    echo    3. Bu betiği tekrar çalıştırın
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js bulundu: %NODE_VERSION%
)

REM npm kontrolü
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ npm bulunamadı!
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ npm bulundu: %NPM_VERSION%
)

echo.

REM Klasör yapısını oluştur
echo 📁 Klasör yapısı hazırlanıyor...
if not exist "import" (
    mkdir "import"
    echo ✅ "import" klasörü oluşturuldu
) else (
    echo ✅ "import" klasörü mevcut
)

if not exist "export" (
    mkdir "export"
    echo ✅ "export" klasörü oluşturuldu
) else (
    echo ✅ "export" klasörü mevcut
)

echo.

REM Node.js paketlerini kur
echo 📦 Node.js paketleri kuruluyor...
npm install

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Paket kurulumu başarısız!
    echo 💡 İnternet bağlantınızı kontrol edin ve tekrar deneyin
    pause
    exit /b 1
)

echo.
echo ✅ Kurulum başarıyla tamamlandı!
echo.
echo 💡 Nasıl Kullanılır:
echo    1. .spz dosyalarınızı "import" klasörüne kopyalayın
echo    2. "run.bat" dosyasını çift tıklayın
echo    3. Dönüştürülen .ply dosyaları "export" klasöründe olacak
echo.
echo 🎉 Hazır! "run.bat" ile başlayabilirsiniz.
echo.
pause