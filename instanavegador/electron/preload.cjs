// Ponte segura entre a interface React e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('bridge', {
  platform: process.platform,
  info: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  chooseFolder: () => ipcRenderer.invoke('dialog:folder'),
  openFolder: () => ipcRenderer.invoke('shell:open'),
  showFile: (file) => ipcRenderer.invoke('shell:show', file),
  // A página do Instagram é uma view nativa; a interface informa onde ela deve ficar.
  setViewBounds: (rect) => ipcRenderer.send('view:bounds', rect),
  setViewVisible: (visible) => ipcRenderer.send('view:visible', visible),
  nav: (action, arg) => ipcRenderer.invoke('nav', { action, arg }),
  getNav: () => ipcRenderer.invoke('nav:get'),
  onNav: on('nav:state'),
  getMedia: () => ipcRenderer.invoke('media:get'),
  clearMedia: () => ipcRenderer.invoke('media:clear'),
  onMedia: on('media:event'),
  download: (ids) => ipcRenderer.invoke('download:start', ids),
  cancelDownload: (id) => ipcRenderer.invoke('download:cancel', id),
  onDownload: on('download:state'),
});
