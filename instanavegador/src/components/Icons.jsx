const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const icon = (paths) => (props) => <svg {...base} {...props}>{paths}</svg>;

export const IconBack = icon(<path d="m15 18-6-6 6-6" />);
export const IconForward = icon(<path d="m9 18 6-6-6-6" />);
export const IconReload = icon(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M8 16H3v5" /></>);
export const IconHome = icon(<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>);
export const IconDownload = icon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>);
export const IconFolder = icon(<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />);
export const IconPanel = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>);
export const IconX = icon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const IconCheck = icon(<path d="M20 6 9 17l-5-5" />);
export const IconAlert = icon(<><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>);
export const IconTrash = icon(<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);
export const IconPlay = icon(<path d="m6 3 14 9-14 9z" fill="currentColor" />);
export const IconLayers = icon(<><path d="m12 2 10 5-10 5L2 7Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></>);
export const IconInfo = icon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
export const IconLogo = (props) => (
  <svg width="26" height="26" viewBox="0 0 32 32" {...props}>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff5f8f" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#lg)" />
    <rect x="7" y="9" width="18" height="14" rx="3.5" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="16" cy="16" r="3.4" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="21.6" cy="12.4" r="1.1" fill="#fff" />
  </svg>
);
