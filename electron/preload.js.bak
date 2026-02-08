const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  showNotification: (data) => ipcRenderer.invoke('show-notification', data),
  focusWindow: () => ipcRenderer.invoke('focus-window'),
});
