import { useCallback, useEffect, useRef, useState } from 'react';
import { IconInfo, IconLogo } from './components/Icons.jsx';
import Toolbar from './components/Toolbar.jsx';
import Panel from './components/Panel.jsx';
import Notice from './components/Notice.jsx';

const bridge = () => window.bridge;

export default function App() {
  const [settings, setSettings] = useState(null);
  const [nav, setNav] = useState({ url: '', path: '/', loading: false, canGoBack: false, canGoForward: false });
  const [media, setMedia] = useState(() => new Map());
  const [downloads, setDownloads] = useState({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [version, setVersion] = useState('');
  const viewport = useRef(null);

  useEffect(() => {
    bridge().getSettings().then((s) => {
      setSettings(s);
      setPanelOpen(s.panelOpen);
    });
    bridge().info().then((i) => setVersion(i.version));
    bridge().getNav().then((n) => n && setNav(n));
    bridge().getMedia().then((list) => setMedia(new Map(list.map((m) => [m.id, m]))));
    const offs = [
      bridge().onNav(setNav),
      bridge().onMedia((ev) => {
        if (ev.type === 'add') setMedia((old) => {
          const next = new Map(old);
          ev.entries.forEach((m) => next.set(m.id, m));
          return next;
        });
        else if (ev.type === 'reset') setMedia(new Map());
        else if (ev.type === 'focus') setPanelOpen(true);
      }),
      bridge().onDownload(({ id, ...patch }) => setDownloads((d) => ({ ...d, [id]: { ...d[id], ...patch } }))),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // A página do Instagram é uma view nativa por cima desta janela: dizemos ao Electron onde ela fica.
  const sendBounds = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    bridge().setViewBounds({ x: r.x, y: r.y, width: r.width, height: r.height });
  }, []);
  useEffect(() => {
    sendBounds();
    const ro = new ResizeObserver(sendBounds);
    ro.observe(viewport.current);
    window.addEventListener('resize', sendBounds);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sendBounds);
    };
  }, [sendBounds, settings, panelOpen]);

  const showNotice = settings && !settings.noticeAccepted;
  // O aviso é HTML; a view nativa ficaria por cima dele, então escondemos a página enquanto ele aparece.
  useEffect(() => {
    bridge().setViewVisible(!showNotice);
  }, [showNotice]);

  const togglePanel = () => {
    const next = !panelOpen;
    setPanelOpen(next);
    bridge().setSettings({ panelOpen: next });
  };

  const accept = async () => setSettings(await bridge().setSettings({ noticeAccepted: true }));
  const chooseFolder = async () => {
    const next = await bridge().chooseFolder();
    if (next) setSettings(next);
  };

  return (
    <div className="app">
      <header className="titlebar">
        <div className="brand">
          <IconLogo />
          <span>InstaNavegador</span>
          <span className="brand-tag">por DLTechSup</span>
        </div>
        <span className="titlebar-note"><IconInfo width={14} height={14} /> Navegador para baixar fotos, vídeos e Reels do Instagram</span>
      </header>

      <Toolbar nav={nav} onNav={(a, arg) => bridge().nav(a, arg)} panelOpen={panelOpen} onTogglePanel={togglePanel} count={media.size} />

      <div className="hint">
        <b>Como usar:</b> entre na sua conta, passe o mouse sobre uma foto, vídeo ou Reel e clique em <span className="pill">⬇ Baixar</span>.
      </div>

      <div className="body">
        <div className="viewport" ref={viewport}>
          <div className="viewport-loading muted">Carregando o Instagram…</div>
        </div>
        {panelOpen && (
          <Panel
            media={media}
            downloads={downloads}
            path={nav.path}
            settings={settings}
            onDownload={(ids) => bridge().download(ids)}
            onCancel={(id) => bridge().cancelDownload(id)}
            onClear={() => bridge().clearMedia()}
            onChooseFolder={chooseFolder}
            onOpenFolder={() => bridge().openFolder()}
            onShow={(file) => bridge().showFile(file)}
          />
        )}
      </div>

      <footer className="footer muted">
        <span>InstaNavegador v{version || '—'}</span>
        <span className="dot" />
        <span>Desenvolvido por <strong className="maker">DLTechSup</strong></span>
        <span className="dot" />
        <span>Use só com conteúdo que você pode baixar</span>
      </footer>

      {showNotice && <Notice onAccept={accept} />}
    </div>
  );
}
