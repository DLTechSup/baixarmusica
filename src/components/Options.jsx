import { IconFolder } from './Icons.jsx';

const QUALITIES = [128, 192, 256, 320];

export default function Options({ settings, onChange, onChooseFolder }) {
  return (
    <div className="options">
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

      <button className="chip" onClick={onChooseFolder} title={settings.outDir}>
        <IconFolder width={15} height={15} />
        <span className="ellipsis">{settings.outDir}</span>
      </button>

      <label className="toggle">
        <input type="checkbox" checked={settings.embedCover} onChange={(e) => onChange({ embedCover: e.target.checked })} />
        <span className="track"><span className="thumb" /></span>
        Capa e dados
      </label>
    </div>
  );
}
