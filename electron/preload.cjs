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
  startDownload: (jobId, url, opts = {}) => ipcRenderer.invoke('download:start', { jobId, url, ...opts }),
  cancelDownload: (jobId) => ipcRenderer.invoke('download:cancel', jobId),
  onProgress: on('download:progress'),
  onDone: on('download:done'),
  onError: on('download:error'),
  checkEngine: () => ipcRenderer.invoke('engine:check'),
  updateEngine: (tag) => ipcRenderer.invoke('engine:update', tag),
  resetEngine: () => ipcRenderer.invoke('engine:reset'),
  onEngineProgress: on('engine:progress'),
  instagramStatus: () => ipcRenderer.invoke('instagram:status'),
  instagramLogin: () => ipcRenderer.invoke('instagram:login'),
  instagramLogout: () => ipcRenderer.invoke('instagram:logout'),
  platform: process.platform,
});
