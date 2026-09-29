import { IconClipboard, IconLink, IconSearch } from './Icons.jsx';
import { isProbablyUrl } from '../format.js';

export default function UrlBar({ value, onChange, onSubmit, loading }) {
  const paste = async () => {
    const text = (await window.api.readClipboard())?.trim();
    if (!text) return;
    onChange(text);
    if (isProbablyUrl(text)) onSubmit(text);
  };

  return (
    <form
      className="urlbar"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <IconLink className="urlbar-icon" />
      <input
        autoFocus
        spellCheck={false}
        placeholder="https://www.youtube.com/watch?v=..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text').trim();
          if (!value && isProbablyUrl(text)) {
            e.preventDefault();
            onChange(text);
            onSubmit(text);
          }
        }}
      />
      <button type="button" className="ghost" onClick={paste} disabled={loading}>
        <IconClipboard width={16} height={16} /> Colar
      </button>
      <button type="submit" className="primary" disabled={loading || !value.trim()}>
        {loading ? <span className="spinner" /> : <IconSearch width={16} height={16} />}
        {loading ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
  );
}
