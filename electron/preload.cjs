const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  chooseFolder: () => ipcRenderer.invoke('dialog:folder'),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  showFile: (file) => ipcRenderer.invoke('shell:show', file),
  openFolder: (dir) => ipcRenderer.invoke('shell:open', dir),
  fetchMedia: (url) => ipcRenderer.invoke('media:fetch', url),
  startDownload: (jobId, url) => ipcRenderer.invoke('download:start', { jobId, url }),
  cancelDownload: (jobId) => ipcRenderer.invoke('download:cancel', jobId),
  onProgress: on('download:progress'),
  onDone: on('download:done'),
  onError: on('download:error'),
  platform: process.platform,
});
