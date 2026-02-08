const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

let mainWindow;

// 1. РЕГИСТРАЦИЯ ПРОТОКОЛА (Исправлено для Windows)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('oriongram', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('oriongram');
}

// 2. ОДИНОЧНЫЙ ЗАПУСК (Фикс ошибки дублирования)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Если кто-то пытается запустить вторую копию (например, через ссылку)
    const url = commandLine.find(arg => arg.startsWith('oriongram://'));
    if (url) handleDeepLink(url);
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// 3. ЛОКАЛЬНЫЙ СЕРВЕР
async function startLocalServer() {
  const server = http.createServer((req, res) => {
    return handler(req, res, {
      public: path.join(__dirname, '../dist'),
      rewrites: [{ source: '**', destination: '/index.html' }]
    });
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

// 4. ОБРАБОТКА ТОКЕНА ИЗ БРАУЗЕРА
function handleDeepLink(url) {
  if (!url || !mainWindow) return;
  console.log('Получена ссылка:', url);
  
  const urlParts = url.split('token=');
  if (urlParts.length > 1) {
    // 1. Берем часть после token=
    // 2. Отрезаем всё после амперсанда (если есть другие параметры)
    // 3. УДАЛЯЕМ лишний слэш в конце, который добавляет Windows!
    let token = urlParts[1].split('&')[0];
    token = token.replace(/\/$/, ""); // Удаляет / если он есть в самом конце
    
    const cleanToken = decodeURIComponent(token);
    
    // Отправляем чистый токен в React
    mainWindow.webContents.send('google-auth-success', cleanToken);
    
    mainWindow.show();
    mainWindow.focus();
  }
}

// 5. СОЗДАНИЕ ОКНА
async function createWindow() {
  const port = await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#141218',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  // Обработка ссылок для macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

// ЗАПУСК ПРИЛОЖЕНИЯ
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ОБРАБОТЧИКИ СОБЫТИЙ (IPC)
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});