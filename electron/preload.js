/* eslint-disable @typescript-eslint/no-var-requires */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  version: process.versions.electron,
  relaunch: () => ipcRenderer.invoke('relaunch'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
});
