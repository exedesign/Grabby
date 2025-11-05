@echo off
chcp 65001 >nul
title SPZ2PLY Otomatik Dönüştürücü

echo.
echo 🚀 SPZ2PLY Otomatik Dönüştürücü
echo    Basit • Hızlı • Sezgisel
echo.

REM Geçerli dizini kontrol et
if not exist "package.json" (
    echo ❌ Hata: package.json bulunamadı!
    echo 💡 Bu betiği spz2ply klasörü içinden çalıştırın
    pause
    exit /b 1
)

REM Node.js varlığını kontrol et
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Hata: Node.js bulunamadı!
    echo 💡 Node.js'i yükleyin: https://nodejs.org
    pause
    exit /b 1
)

REM npm paketlerini kontrol et
if not exist "node_modules" (
    echo 📦 Node.js paketleri kuruluyor...
    npm install
    echo.
    if %ERRORLEVEL% neq 0 (
        echo ❌ Paket kurulumu başarısız!
        pause
        exit /b 1
    )
)

REM Ana programı çalıştır
node auto-convert.js

echo.
echo Press any key to exit...
pause >nul