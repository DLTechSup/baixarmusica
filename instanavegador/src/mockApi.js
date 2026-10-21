// API simulada para visualizar a interface fora do Electron.
const subs = { nav: new Set(), media: new Set(), dl: new Set() };
const sub = (k) => (cb) => (subs[k].add(cb), () => subs[k].delete(cb));
const svg = (c) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${c}"/></svg>`)}`;
const colors = ['#ff5f8f', '#8b5cf6', '#34d399', '#f59e0b', '#38bdf8', '#f87171'];
const entries = Array.from({ length: 8 }, (_, i) => ({
  id: `M${i}`, code: `M${i}`, index: (i % 3) + 1, count: i % 3 === 0 ? 3 : 1, owner: 'chicodocaranguejocumbuco',
  kind: i === 4 || i === 5 ? 'video' : 'photo', reel: i === 5, thumb: svg(colors[i % 6]), url: 'x', keys: [], caption: '', taken: 0, page: '/', seq: i + 1,
}));

export const mockBridge = {
  platform: 'web',
  info: async () => ({ version: '1.0.0' }),
  getSettings: async () => ({ outDir: 'C:\\Users\\Voce\\Imagens\\InstaNavegador', noticeAccepted: new URLSearchParams(location.search).has('ok'), panelOpen: true }),
  setSettings: async (p) => ({ outDir: 'C:\\Users\\Voce\\Imagens\\InstaNavegador', noticeAccepted: true, panelOpen: true, ...p }),
  chooseFolder: async () => null, openFolder: async () => {}, showFile: async () => {},
  setViewBounds: () => {}, setViewVisible: () => {},
  nav: async () => {},
  getNav: async () => null,
  onNav: (cb) => { setTimeout(() => cb({ url: 'https://www.instagram.com/chicodocaranguejocumbuco/', path: '/', loading: false, canGoBack: true, canGoForward: false }), 50); return sub('nav')(cb); },
  getMedia: async () => entries,
  clearMedia: async () => {},
  onMedia: sub('media'),
  download: async (ids) => ids.forEach((id) => {
    subs.dl.forEach((cb) => cb({ id, status: id === 'M3' ? 'error' : 'done', percent: 100, error: 'link expirado', file: '/x' }));
  }),
  cancelDownload: async () => {},
  onDownload: sub('dl'),
};
