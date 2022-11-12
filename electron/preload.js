/* eslint-disable @typescript-eslint/no-var-requires */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  version: process.versions.electron,
  close: () => ipcRenderer.invoke('close'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
});
