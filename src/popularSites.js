// Sites mais usados, em destaque na tela. A lista completa vem de sites.json (gerada a partir do motor).
export const POPULAR_SITES = [
  { name: 'YouTube', domain: 'youtube.com', kind: 'video', color: '#ff3b3b' },
  { name: 'YouTube Music', domain: 'music.youtube.com', kind: 'music', color: '#ff3b3b' },
  { name: 'SoundCloud', domain: 'soundcloud.com', kind: 'music', color: '#ff7a1a' },
  { name: 'TikTok', domain: 'tiktok.com', kind: 'video', color: '#25f4ee' },
  { name: 'Instagram', domain: 'instagram.com', kind: 'video', color: '#e1306c' },
  { name: 'Facebook', domain: 'facebook.com', kind: 'video', color: '#1877f2' },
  { name: 'X (Twitter)', domain: 'x.com', kind: 'video', color: '#e7e7e7' },
  { name: 'Vimeo', domain: 'vimeo.com', kind: 'video', color: '#1ab7ea' },
  { name: 'Bandcamp', domain: 'bandcamp.com', kind: 'music', color: '#1da0c3' },
  { name: 'Mixcloud', domain: 'mixcloud.com', kind: 'music', color: '#5000ff' },
  { name: 'Audiomack', domain: 'audiomack.com', kind: 'music', color: '#ffa200' },
  { name: 'Palco MP3', domain: 'palcomp3.com.br', kind: 'music', color: '#00c853' },
  { name: 'Jamendo', domain: 'jamendo.com', kind: 'music', color: '#f6416c' },
  { name: 'Audius', domain: 'audius.co', kind: 'music', color: '#cc0fe0' },
  { name: 'BandLab', domain: 'bandlab.com', kind: 'music', color: '#f12c4c' },
  { name: 'Dailymotion', domain: 'dailymotion.com', kind: 'video', color: '#2a6bff' },
  { name: 'Twitch', domain: 'twitch.tv', kind: 'video', color: '#9146ff' },
  { name: 'Kick', domain: 'kick.com', kind: 'video', color: '#53fc18' },
  { name: 'Reddit', domain: 'reddit.com', kind: 'video', color: '#ff4500' },
  { name: 'Pinterest', domain: 'pinterest.com', kind: 'video', color: '#e60023' },
  { name: 'Bluesky', domain: 'bsky.app', kind: 'video', color: '#1185fe' },
  { name: 'Tumblr', domain: 'tumblr.com', kind: 'video', color: '#5f84b0' },
  { name: 'LinkedIn', domain: 'linkedin.com', kind: 'video', color: '#0a66c2' },
  { name: 'Globo', domain: 'globo.com', kind: 'video', color: '#f74b23' },
  { name: 'Bilibili', domain: 'bilibili.com', kind: 'video', color: '#00a1d6' },
  { name: 'Rumble', domain: 'rumble.com', kind: 'video', color: '#85c742' },
  { name: 'Odysee', domain: 'odysee.com', kind: 'video', color: '#ef1970' },
  { name: 'VK', domain: 'vk.com', kind: 'video', color: '#0077ff' },
  { name: 'Streamable', domain: 'streamable.com', kind: 'video', color: '#2f80ed' },
  { name: '9GAG', domain: '9gag.com', kind: 'video', color: '#cfcfcf' },
  { name: 'Imgur', domain: 'imgur.com', kind: 'video', color: '#1bb76e' },
  { name: 'Loom', domain: 'loom.com', kind: 'video', color: '#625df5' },
  { name: 'Google Drive', domain: 'drive.google.com', kind: 'video', color: '#34a853' },
  { name: 'Dropbox', domain: 'dropbox.com', kind: 'video', color: '#0061ff' },
  { name: 'Internet Archive', domain: 'archive.org', kind: 'music', color: '#b8b8b8' },
];

// Nome amigável para o domínio detectado no link (ex.: "music.youtube.com" -> "YouTube Music").
export function friendlySite(domain) {
  if (!domain) return '';
  const d = domain.toLowerCase().replace(/^(www|m|mobile)\./, '');
  const exact = POPULAR_SITES.find((s) => s.domain === d);
  if (exact) return exact.name;
  const parent = POPULAR_SITES.find((s) => d.endsWith(`.${s.domain}`) || s.domain.endsWith(`.${d}`));
  if (parent) return parent.name;
  if (d === 'youtu.be') return 'YouTube';
  if (d === 'twitter.com') return 'X (Twitter)';
  if (d === 'fb.watch') return 'Facebook';
  return d;
}
