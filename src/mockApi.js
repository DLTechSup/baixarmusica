// API simulada para visualizar a interface no navegador, sem o Electron.
const listeners = { progress: new Set(), done: new Set(), error: new Set() };
const emit = (type, payload) => listeners[type].forEach((cb) => cb(payload));
const sub = (type) => (cb) => {
  listeners[type].add(cb);
  return () => listeners[type].delete(cb);
};
let settings = { outDir: '~/Música/DLTechSup', quality: 320, embedCover: true, concurrency: 2 };
const timers = new Map();

const sample = (id, title, artist, duration) => ({
  id, title, artist, duration,
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
});

export const mockApi = {
  platform: 'web',
  info: async () => ({ version: '1.0.0', engine: '2026.08.19', platform: 'web' }),
  getSettings: async () => settings,
  setSettings: async (patch) => (settings = { ...settings, ...patch }),
  chooseFolder: async () => settings,
  readClipboard: async () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  showFile: async () => {},
  openFolder: async () => {},
  fetchMedia: async (url) => {
    await new Promise((r) => setTimeout(r, 700));
    if (/list=/.test(url)) {
      return {
        ok: true,
        data: {
          type: 'playlist', title: 'Clássicos dos Anos 80', artist: 'Minha Playlist',
          thumbnail: 'https://i.ytimg.com/vi/djV11Xbc914/mqdefault.jpg',
          tracks: [
            sample('djV11Xbc914', 'a-ha - Take On Me', 'a-ha', 227),
            sample('9jK-NcRmVcw', 'Europe - The Final Countdown', 'Europe', 310),
            sample('lDK9QqIzhwk', 'Bon Jovi - Livin\' On A Prayer', 'Bon Jovi', 251),
            sample('1w7OgIMMRc4', 'Guns N\' Roses - Sweet Child O\' Mine', 'Guns N\' Roses', 356),
          ],
        },
      };
    }
    return { ok: true, data: { type: 'track', ...sample('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up', 'Rick Astley', 213) } };
  },
  startDownload: async (jobId) => {
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 12;
      if (p < 100) emit('progress', { jobId, stage: 'download', percent: p, speed: 2.4e6, eta: (100 - p) / 8 });
      else if (p < 130) emit('progress', { jobId, stage: 'convert', percent: null });
      else {
        clearInterval(t);
        emit('done', { jobId, file: '/tmp/musica.mp3' });
      }
    }, 300);
    timers.set(jobId, t);
  },
  cancelDownload: async (jobId) => clearInterval(timers.get(jobId)),
  onProgress: sub('progress'),
  onDone: sub('done'),
  onError: sub('error'),
};
