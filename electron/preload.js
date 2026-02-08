const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onGoogleAuthSuccess: (callback) => ipcRenderer.on('google-auth-success', (_, token) => callback(token)),
});