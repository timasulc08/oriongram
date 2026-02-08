@echo off
echo ==========================================
echo   SBORKA ORIONGRAM (SIMPLE MODE)
echo ==========================================

echo.
echo 1. Sobiraem sajt (Vite)...
call npm run build

echo.
echo 2. Sozdaem EXE (electron-packager)...
REM --ignore исключает лишние папки, чтобы exe не весил 500мб
call npx -y electron-packager . OrionGram --platform=win32 --arch=x64 --out=final_app --overwrite --icon=build/icon.ico --ignore="android" --ignore="src" --ignore="tools" --ignore=".git"

echo.
echo ==========================================
echo   GOTOVO!
echo ==========================================
echo.
echo Tvoy EXE lezhit tut:
echo final_app\OrionGram-win32-x64\OrionGram.exe
echo.
echo Mozhesh zapuskat'!
echo.
pause