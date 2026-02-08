@echo off
setlocal
cd /d "%~dp0"

REM Автоматически подхватить JDK 17 из Android Studio
if "%JAVA_HOME%"=="" (
  if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
  )
)

echo JAVA_HOME=%JAVA_HOME%
node "%~dp0tools\build-all.js" %*
exit /b %errorlevel%