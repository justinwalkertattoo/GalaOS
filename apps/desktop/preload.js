const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startServices: () => ipcRenderer.invoke('services:start'),
  stopServices: () => ipcRenderer.invoke('services:stop'),
  openDocker: () => ipcRenderer.invoke('services:openDocker'),
  openWeb: () => ipcRenderer.invoke('web:open'),
  hwGetMetrics: () => ipcRenderer.invoke('hw:getMetrics'),
  hwMonitorStart: (ms) => ipcRenderer.invoke('hw:monitorStart', ms),
  hwMonitorStop: () => ipcRenderer.invoke('hw:monitorStop'),
  hwScanDrivers: () => ipcRenderer.invoke('hw:scanDrivers'),
  hwRecommendations: () => ipcRenderer.invoke('hw:recommendations'),
  onHardwareMetrics: (cb) => ipcRenderer.on('hw:metrics', (_e, data) => cb(data)),
});
