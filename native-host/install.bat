@echo off
chcp 65001 >nul
title Grabby Native Host Kurulum

echo.
echo 🔗 Grabby Native Host - Kurulum
echo    SPZ2PLY entegrasyonu için gerekli
echo.

REM Python kontrolü
echo 🔍 Python kontrol ediliyor...
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Python bulunamadı!
    echo 💡 Python'u yükleyin: https://python.org
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo ✅ Python bulundu: %PYTHON_VERSION%
)

echo.

REM Mevcut dizini al
set CURRENT_DIR=%~dp0
set CURRENT_DIR=%CURRENT_DIR:~0,-1%

echo 📁 Kurulum dizini: %CURRENT_DIR%
echo 📝 Native host dosyası: grabby_host.py
echo 📋 Registry dosyası: com.grabby.filemanager.json

REM JSON dosyasını güncelle
echo.
echo 🔧 Registry dosyası güncelleniyor...

(
echo {
echo   "name": "com.grabby.filemanager",
echo   "description": "Grabby Native Host for SPZ2PLY integration",
echo   "path": "%CURRENT_DIR%\\grabby_host.py",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://YOUR_EXTENSION_ID/"
echo   ]
echo }
) > "%CURRENT_DIR%\com.grabby.filemanager.json"

echo ✅ JSON dosyası oluşturuldu

REM Registry'ye ekle
echo.
echo 📝 Registry'ye ekleniyor...
reg add "HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.grabby.filemanager" /ve /t REG_SZ /d "%CURRENT_DIR%\com.grabby.filemanager.json" /f >nul 2>&1

if %ERRORLEVEL% neq 0 (
    echo ❌ Registry kaydı başarısız!
    echo 💡 Yönetici olarak çalıştırmayı deneyin
    pause
    exit /b 1
) else (
    echo ✅ Registry kaydı başarılı
)

echo.
echo ✅ Native Host kurulumu tamamlandı!
echo.
echo 💡 Önemli Not:
echo    Extension ID'yi güncellemek için:
echo    1. Chrome'da chrome://extensions açın
echo    2. Grabby extension'ının ID'sini kopyalayın
echo    3. com.grabby.filemanager.json dosyasını düzenleyin
echo    4. YOUR_EXTENSION_ID kısmını gerçek ID ile değiştirin
echo.
pause
