import { useEffect, useMemo, useRef, useState } from 'react';
import allSites from '../sites.json';
import { POPULAR_SITES } from '../popularSites.js';
import { IconGlobe, IconMusic, IconSearch, IconVideo, IconX } from './Icons.jsx';

const TOTAL = allSites.length.toLocaleString('pt-BR');
const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const openSite = (domain) => window.open(`https://${domain}`, '_blank');

function SiteBadge({ site, onClick }) {
  return (
    <button className="site-chip" onClick={onClick} title={`Abrir ${site.domain}`}>
      <span className="site-dot" style={{ background: site.color }}>{site.name[0]}</span>
      {site.name}
    </button>
  );
}

// Faixa abaixo do campo de link: alguns sites populares + botão para a lista completa.
export function SitesStrip({ onOpen }) {
  return (
    <div className="sites-strip">
      <span className="muted small-label">Funciona com</span>
      {POPULAR_SITES.slice(0, 7).map((s) => (
        <span key={s.name} className="site-pill">
          <span className="site-dot mini" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
      <button className="link-btn" onClick={onOpen}>
        Ver todos os {TOTAL} sites →
      </button>
    </div>
  );
}

export default function SitesModal({ onClose }) {
  const [tab, setTab] = useState('popular');
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = normalize(query.trim());
  const popular = useMemo(
    () => POPULAR_SITES.filter((s) => !q || normalize(`${s.name} ${s.domain}`).includes(q)),
    [q],
  );
  const all = useMemo(() => {
    const matches = allSites.filter((s) => !q || normalize(`${s.name} ${s.desc || ''} ${s.keys || ''}`).includes(q));
    if (!q) return matches;
    // Sites populares que batem com a busca aparecem primeiro, com o nome amigável
    const featured = popular.map((s) => ({ name: s.name, desc: s.domain, featured: true }));
    return [...featured, ...matches];
  }, [q, popular]);
  const music = popular.filter((s) => s.kind === 'music');
  const video = popular.filter((s) => s.kind === 'video');

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sites-title">
        <div className="modal-head">
          <div>
            <h2 id="sites-title">Sites suportados</h2>
            <p className="muted">
              O Sonora baixa músicas e vídeos de <strong className="maker">{TOTAL} sites</strong>. É só colar o link.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <IconX width={18} height={18} />
          </button>
        </div>

        <div className="modal-tools">
          <div className="search">
            <IconSearch width={16} height={16} />
            <input
              ref={inputRef}
              placeholder="Procurar um site…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="segmented">
            <button className={tab === 'popular' ? 'active' : ''} onClick={() => setTab('popular')}>
              Populares
            </button>
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
              Todos <small>{TOTAL}</small>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {tab === 'popular' ? (
            <>
              {music.length > 0 && (
                <>
                  <h4 className="group-title"><IconMusic width={14} height={14} /> Música</h4>
                  <div className="site-grid">
                    {music.map((s) => <SiteBadge key={s.name} site={s} onClick={() => openSite(s.domain)} />)}
                  </div>
                </>
              )}
              {video.length > 0 && (
                <>
                  <h4 className="group-title"><IconVideo width={14} height={14} /> Vídeo e redes sociais</h4>
                  <div className="site-grid">
                    {video.map((s) => <SiteBadge key={s.name} site={s} onClick={() => openSite(s.domain)} />)}
                  </div>
                </>
              )}
              {popular.length === 0 && (
                <p className="muted empty-search">
                  Nenhum site popular com esse nome.{' '}
                  <button className="link-btn" onClick={() => setTab('all')}>Procurar em todos os {TOTAL}</button>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="muted small-label">{all.length.toLocaleString('pt-BR')} resultados</p>
              <ul className="site-list">
                {all.map((s) => (
                  <li key={`${s.featured ? 'p' : 'a'}-${s.name}`} className={s.featured ? 'featured' : ''}>
                    <IconGlobe width={14} height={14} />
                    <span className="site-name">{s.name}</span>
                    {s.desc && <span className="muted ellipsis" title={s.desc}>{s.desc}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="modal-foot muted">
          Alguns sites exigem login: entre no site pelo navegador e ative <strong>Login do navegador</strong> nas opções.
          Conteúdo protegido contra cópia (DRM), como Spotify e Netflix, não pode ser baixado.
        </div>
      </div>
    </div>
  );
}
