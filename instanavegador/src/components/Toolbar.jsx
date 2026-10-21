import { useEffect, useState } from 'react';
import { IconBack, IconForward, IconHome, IconPanel, IconReload } from './Icons.jsx';

export default function Toolbar({ nav, onNav, panelOpen, onTogglePanel, count }) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(nav.url || '');
  }, [nav.url, editing]);

  return (
    <div className="toolbar">
      <button className="icon-btn" disabled={!nav.canGoBack} onClick={() => onNav('back')} title="Voltar"><IconBack /></button>
      <button className="icon-btn" disabled={!nav.canGoForward} onClick={() => onNav('forward')} title="Avançar"><IconForward /></button>
      <button className="icon-btn" onClick={() => onNav('reload')} title="Recarregar"><IconReload className={nav.loading ? 'spin' : ''} /></button>
      <button className="icon-btn" onClick={() => onNav('home')} title="Início do Instagram"><IconHome /></button>
      <form
        className="address"
        onSubmit={(e) => {
          e.preventDefault();
          onNav('go', text);
          e.target.querySelector('input').blur();
        }}
      >
        <input
          value={text}
          spellCheck={false}
          placeholder="Cole um link do Instagram ou digite @usuario"
          onFocus={(e) => {
            setEditing(true);
            e.target.select();
          }}
          onBlur={() => setEditing(false)}
          onChange={(e) => setText(e.target.value)}
        />
      </form>
      <button className={`panel-btn ${panelOpen ? 'on' : ''}`} onClick={onTogglePanel} title="Mostrar/ocultar painel de downloads">
        <IconPanel /> Mídias
        {count > 0 && <span className="count">{count}</span>}
      </button>
    </div>
  );
}
