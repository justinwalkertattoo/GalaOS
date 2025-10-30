const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startServices: () => ipcRenderer.invoke('services:start'),
  stopServices: () => ipcRenderer.invoke('services:stop'),
  openDocker: () => ipcRenderer.invoke('services:openDocker'),
  openWeb: () => ipcRenderer.invoke('web:open'),
});
