import { useMemo, useState } from 'react';
import { IconDownload, IconList, IconMusic, IconX } from './Icons.jsx';
import { formatDuration } from '../format.js';

function Cover({ src, className = '' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`cover ${className}`}>
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : <IconMusic />}
    </div>
  );
}

export { Cover };

export default function Preview({ data, onDownload, onClose }) {
  const isPlaylist = data.type === 'playlist';
  const [selected, setSelected] = useState(() => new Set(isPlaylist ? data.tracks.map((t) => t.id) : []));
  const total = useMemo(
    () => (isPlaylist ? data.tracks.filter((t) => selected.has(t.id)).reduce((s, t) => s + (t.duration || 0), 0) : data.duration),
    [data, selected, isPlaylist],
  );

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = isPlaylist && selected.size === data.tracks.length;

  return (
    <section className="card preview">
      <button className="icon-btn close" onClick={onClose} title="Fechar">
        <IconX width={16} height={16} />
      </button>
      <div className="preview-head">
        <Cover src={data.thumbnail} className="large" />
        <div className="preview-meta">
          <span className="eyebrow">{isPlaylist ? <><IconList width={14} height={14} /> Playlist · {data.tracks.length} músicas</> : 'Música'}</span>
          <h2>{data.title}</h2>
          <p className="muted">
            {data.artist}
            {total ? ` · ${formatDuration(total)}` : ''}
          </p>
          <button
            className="primary big"
            disabled={isPlaylist && selected.size === 0}
            onClick={() => onDownload(isPlaylist ? data.tracks.filter((t) => selected.has(t.id)) : [data])}
          >
            <IconDownload width={18} height={18} />
            {isPlaylist ? `Baixar ${selected.size} ${selected.size === 1 ? 'música' : 'músicas'}` : 'Baixar MP3'}
          </button>
        </div>
      </div>

      {isPlaylist && (
        <div className="tracklist">
          <label className="track-row select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(data.tracks.map((t) => t.id)))}
            />
            <span>Selecionar todas</span>
          </label>
          {data.tracks.map((t, i) => (
            <label key={t.id} className="track-row">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
              <span className="index">{i + 1}</span>
              <span className="ellipsis grow">{t.title}</span>
              <span className="muted mono">{formatDuration(t.duration)}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
