export function formatDuration(sec) {
  if (!sec && sec !== 0) return '';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function formatSpeed(bps) {
  if (!bps) return '';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let i = 0;
  while (bps >= 1024 && i < units.length - 1) {
    bps /= 1024;
    i++;
  }
  return `${bps.toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function formatEta(sec) {
  if (!sec && sec !== 0) return '';
  return sec < 60 ? `${Math.round(sec)}s` : formatDuration(sec);
}

export function isProbablyUrl(text) {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/i.test(String(text).trim());
}
