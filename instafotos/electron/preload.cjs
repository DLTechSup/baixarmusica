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
  openFolder: (dir) => ipcRenderer.invoke('shell:open', dir),
  openLink: (url) => ipcRenderer.invoke('shell:link', url),
  startList: (listId, target) => ipcRenderer.invoke('list:start', { listId, target }),
  cancelList: (listId) => ipcRenderer.invoke('list:cancel', listId),
  onListEvent: on('list:event'),
  download: (shortcode) => ipcRenderer.invoke('photo:download', shortcode),
  platform: process.platform,
});
