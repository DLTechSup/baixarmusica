const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const icon = (paths) => (props) => <svg {...base} {...props}>{paths}</svg>;

export const IconLogo = (props) => (
  <svg width="28" height="28" viewBox="0 0 32 32" {...props}>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff5f8f" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#lg)" />
    <path d="M13 21.5V10.5l9-2v11" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11" cy="21.5" r="2.5" fill="#fff" />
    <circle cx="20" cy="19.5" r="2.5" fill="#fff" />
  </svg>
);
export const IconLink = icon(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>);
export const IconClipboard = icon(<><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>);
export const IconSearch = icon(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
export const IconDownload = icon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>);
export const IconFolder = icon(<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />);
export const IconX = icon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const IconCheck = icon(<path d="M20 6 9 17l-5-5" />);
export const IconRetry = icon(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M8 16H3v5" /></>);
export const IconAlert = icon(<><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>);
export const IconMusic = icon(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>);
export const IconList = icon(<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>);
export const IconTrash = icon(<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);
export const IconPlay = icon(<path d="m6 3 14 9-14 9z" />);
