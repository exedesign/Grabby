@echo off
chcp 65001 >nul
title Grabby Klasör Temizliği

echo.
echo 🧹 Grabby - Klasör Temizliği
echo    Gereksiz dosyaları temizleme aracı
echo.

echo 🔍 Mevcut durum kontrol ediliyor...

REM Ana klasördeki gereksiz dosyalar
set "CLEANUP_FILES=background_old.js popup_old.html popup_old.js"
set "FOUND_FILES=0"

for %%f in (%CLEANUP_FILES%) do (
    if exist "%%f" (
        echo ❌ Gereksiz dosya bulundu: %%f
        set /a FOUND_FILES+=1
        del /q "%%f" >nul 2>&1
        if exist "%%f" (
            echo   ⚠️  Silinemedi: %%f
        ) else (
            echo   ✅ Silindi: %%f
        )
    )
)

REM spz2ply klasöründeki gereksiz dosyalar
if exist "spz2ply" (
    cd spz2ply
    
    set "SPZ_CLEANUP=convert-all.bat input output PLY README-old.md setup-old.bat"
    for %%f in (%SPZ_CLEANUP%) do (
        if exist "%%f" (
            echo ❌ spz2ply'de gereksiz: %%f
            set /a FOUND_FILES+=1
            if exist "%%f\*" (
                rmdir /s /q "%%f" >nul 2>&1
            ) else (
                del /q "%%f" >nul 2>&1
            )
            if exist "%%f" (
                echo   ⚠️  Silinemedi: %%f
            ) else (
                echo   ✅ Silindi: %%f
            )
        )
    )
    
    cd ..
)

echo.
if %FOUND_FILES% equ 0 (
    echo ✅ Klasör zaten temiz! Gereksiz dosya bulunamadı.
) else (
    echo 🎉 Temizlik tamamlandı! %FOUND_FILES% gereksiz öğe işlendi.
)

echo.
echo 📁 Mevcut temiz yapı:
echo    ├── background.js          (Ana extension motoru)
echo    ├── popup.js/html         (Kullanıcı arayüzü)
echo    ├── manifest.json         (Extension yapılandırması)
echo    ├── i18n.js              (Çoklu dil desteği)
echo    ├── options.js/html      (Ayarlar sayfası)
echo    ├── spz2ply/             (Dönüştürme sistemi)
echo    │   ├── import/          (SPZ dosyaları buraya)
echo    │   ├── export/          (PLY dosyaları burada)
echo    │   ├── auto-convert.js  (Otomatik dönüştürücü)
echo    │   ├── run.bat          (Çalıştırma scripti)
echo    │   └── setup.bat        (Kurulum scripti)
echo    └── native-host/         (Sistem entegrasyonu)
echo        ├── grabby_host.py   (Python native host)
echo        └── install.bat      (Native host kurulumu)
echo.

pause