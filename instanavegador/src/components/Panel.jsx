import { useMemo, useState } from 'react';
import { IconAlert, IconCheck, IconDownload, IconFolder, IconInfo, IconLayers, IconPlay, IconTrash, IconX } from './Icons.jsx';

const proxied = (url) => (url ? `igimg://img/?u=${encodeURIComponent(url)}` : '');
const TABS = [
  ['all', 'Tudo'],
  ['photo', 'Fotos'],
  ['video', 'Vídeos'],
  ['reel', 'Reels'],
];

function Card({ item, dl, selected, onToggle, onDownload, onCancel, onShow }) {
  const [broken, setBroken] = useState(false);
  const status = dl?.status;
  return (
    <div className={`card ${selected ? 'selected' : ''}`}>
      <div className="thumb" onClick={onToggle}>
        {item.thumb && !broken ? <img src={proxied(item.thumb)} alt="" loading="lazy" onError={() => setBroken(true)} /> : <div className="noimg">🖼</div>}
        <input type="checkbox" className="pick" checked={selected} onChange={onToggle} onClick={(e) => e.stopPropagation()} />
        <div className="badges">
          {item.count > 1 && <span className="badge"><IconLayers width={11} height={11} /> {item.index}/{item.count}</span>}
          {item.kind === 'video' && <span className="badge"><IconPlay width={10} height={10} /> {item.reel ? 'Reel' : 'Vídeo'}</span>}
        </div>
        {status && (
          <div className={`status ${status}`}>
            {status === 'done' && <><IconCheck width={14} height={14} /> Salvo</>}
            {status === 'error' && <><IconAlert width={14} height={14} /> Erro</>}
            {(status === 'queued' || status === 'cancelled') && (status === 'queued' ? 'Na fila' : 'Cancelado')}
            {status === 'downloading' && `${Math.floor(dl.percent || 0)}%`}
          </div>
        )}
      </div>
      <div className="card-foot">
        <span className="ellipsis" title={item.caption || item.owner}>{item.owner ? `@${item.owner}` : item.code}</span>
        {status === 'downloading' || status === 'queued' ? (
          <button className="mini" title="Cancelar" onClick={onCancel}><IconX width={14} height={14} /></button>
        ) : status === 'done' ? (
          <button className="mini" title="Mostrar na pasta" onClick={onShow}><IconFolder width={14} height={14} /></button>
        ) : (
          <button className="mini" title={status === 'error' ? dl.error : 'Baixar'} onClick={onDownload}><IconDownload width={14} height={14} /></button>
        )}
      </div>
    </div>
  );
}

export default function Panel({ media, downloads, path, settings, onDownload, onCancel, onClear, onChooseFolder, onOpenFolder, onShow }) {
  const [tab, setTab] = useState('all');
  const [onlyPage, setOnlyPage] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const items = useMemo(() => {
    let list = [...media.values()].sort((a, b) => b.seq - a.seq);
    if (onlyPage) list = list.filter((m) => m.page === path);
    if (tab === 'photo') list = list.filter((m) => m.kind === 'photo');
    if (tab === 'video') list = list.filter((m) => m.kind === 'video' && !m.reel);
    if (tab === 'reel') list = list.filter((m) => m.reel);
    return list;
  }, [media, tab, onlyPage, path]);

  const chosen = items.filter((m) => selected.has(m.id));
  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allSelected = items.length > 0 && chosen.length === items.length;
  const pending = items.filter((m) => !['done', 'downloading', 'queued'].includes(downloads[m.id]?.status));

  return (
    <aside className="panel">
      <div className="panel-head">
        <h3>Mídias encontradas</h3>
        <span className="muted">{media.size}</span>
        <span className="grow" />
        {media.size > 0 && <button className="ghost small" onClick={() => { setSelected(new Set()); onClear(); }}><IconTrash width={14} height={14} /> Limpar</button>}
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <label className="check"><input type="checkbox" checked={onlyPage} onChange={(e) => setOnlyPage(e.target.checked)} /> Só desta página</label>

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><IconInfo width={26} height={26} /></div>
          <p><b>Nada por aqui ainda.</b></p>
          <p className="muted">Entre no Instagram e abra um perfil, post ou Reel. As fotos e vídeos que aparecerem na tela entram nesta lista.</p>
        </div>
      ) : (
        <>
          <div className="select-row">
            <label className="check"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((m) => m.id)))} /> Selecionar tudo</label>
            <span className="muted">{chosen.length ? `${chosen.length} selecionada${chosen.length === 1 ? '' : 's'}` : `${items.length} itens`}</span>
          </div>
          <div className="grid">
            {items.map((m) => (
              <Card
                key={m.id}
                item={m}
                dl={downloads[m.id]}
                selected={selected.has(m.id)}
                onToggle={() => toggle(m.id)}
                onDownload={() => onDownload([m.id])}
                onCancel={() => onCancel(m.id)}
                onShow={() => onShow(downloads[m.id]?.file)}
              />
            ))}
          </div>
        </>
      )}

      <div className="panel-foot">
        <div className="foot-actions">
          <button className="primary" disabled={chosen.length === 0} onClick={() => onDownload(chosen.map((m) => m.id))}>
            <IconDownload width={16} height={16} /> Baixar {chosen.length || ''} selecionada{chosen.length === 1 ? '' : 's'}
          </button>
          <button className="ghost" disabled={pending.length === 0} onClick={() => onDownload(pending.map((m) => m.id))} title="Baixar tudo o que está na lista">
            Baixar tudo
          </button>
        </div>
        <div className="folder">
          <button className="chip" onClick={onChooseFolder} title={settings?.outDir}><IconFolder width={14} height={14} /><span className="ellipsis">{settings?.outDir}</span></button>
          <button className="ghost small" onClick={onOpenFolder}>Abrir</button>
        </div>
      </div>
    </aside>
  );
}
