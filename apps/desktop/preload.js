const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startServices: () => ipcRenderer.invoke('services:start'),
  openDocker: () => ipcRenderer.invoke('services:openDocker'),
});

