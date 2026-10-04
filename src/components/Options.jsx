import { IconFolder, IconMusic, IconVideo } from './Icons.jsx';

const QUALITIES = [128, 192, 256, 320];
const VIDEO_QUALITIES = [{ value: 0, label: 'Máx.' }, { value: 1080, label: '1080p' }, { value: 720, label: '720p' }, { value: 480, label: '480p' }, { value: 360, label: '360p' }];

export default function Options({ settings, onChange, onChooseFolder }) {
  const isVideo = settings.mode === 'video';
  return (
    <div className="options">
      <div className="segmented" role="radiogroup" aria-label="Formato">
        <button role="radio" aria-checked={!isVideo} className={!isVideo ? 'active' : ''} onClick={() => onChange({ mode: 'audio' })}>
          <IconMusic width={14} height={14} /> Áudio MP3
        </button>
        <button role="radio" aria-checked={isVideo} className={isVideo ? 'active' : ''} onClick={() => onChange({ mode: 'video' })}>
          <IconVideo width={14} height={14} /> Vídeo MP4
        </button>
      </div>

      {isVideo ? (
        <div className="segmented" role="radiogroup" aria-label="Qualidade do vídeo">
          {VIDEO_QUALITIES.map((q) => (
            <button
              key={q.value}
              role="radio"
              aria-checked={settings.videoQuality === q.value}
              className={settings.videoQuality === q.value ? 'active' : ''}
              onClick={() => onChange({ videoQuality: q.value })}
            >
              {q.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="segmented" role="radiogroup" aria-label="Qualidade do MP3">
          {QUALITIES.map((q) => (
            <button
              key={q}
              role="radio"
              aria-checked={settings.quality === q}
              className={settings.quality === q ? 'active' : ''}
              onClick={() => onChange({ quality: q })}
            >
              {q} <small>kbps</small>
            </button>
          ))}
        </div>
      )}

      <button className="chip" onClick={onChooseFolder} title={settings.outDir}>
        <IconFolder width={15} height={15} />
        <span className="ellipsis">{settings.outDir}</span>
      </button>

      <label className="toggle">
        <input type="checkbox" checked={settings.embedCover} onChange={(e) => onChange({ embedCover: e.target.checked })} />
        <span className="track"><span className="thumb" /></span>
        {isVideo ? 'Miniatura e dados' : 'Capa e dados'}
      </label>
    </div>
  );
}
