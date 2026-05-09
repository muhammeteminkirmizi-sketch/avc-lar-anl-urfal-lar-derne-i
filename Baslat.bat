@echo off
color 0A
title Avcilar-Sanliurfa-Dernegi Baslatici

echo ====================================================
echo    Avcilar-Sanliurfa-Dernegi Baslatiliyor...
echo ====================================================

IF NOT EXIST "node_modules" (
    echo [BILGI] node_modules klasoru bulunamadi. Ilk kurulum yapiliyor...
    echo Lutfen bekleyin, moduller indiriliyor...
    call npm install
    echo Kurulum tamamlandi.
)

echo [BILGI] Sunucu baslatiliyor...
start http://localhost:3000
node server.js
pause
