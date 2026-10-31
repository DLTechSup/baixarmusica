import { useEffect, useState } from 'react';
import { IconAlert, IconCheck, IconRetry, IconX } from './Icons.jsx';

const api = () => window.api;
const SOURCE = { updated: 'baixado pelo Sonora', bundled: 'do instalador', source: 'código-fonte (desenvolvimento)' };

function EngineSection({ info, onInfo }) {
  // idle | checking | uptodate | available | installing | installed | error
  const [state, setState] = useState('idle');
  const [latest, setLatest] = useState('');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => api().onEngineProgress(({ percent: p }) => setPercent(p)), []);

  const check = async () => {
    setState('checking');
    setMessage('');
    const res = await api().checkEngine();
    if (!res.ok) {
      setState('error');
      setMessage(res.error);
    } else if (res.available) {
      setLatest(res.latest);
      setState('available');
    } else {
      setLatest(res.latest);
      setState('uptodate');
    }
  };

  const install = async () => {
    setState('installing');
    setPercent(0);
    const res = await api().updateEngine(latest);
    if (res.ok) {
      onInfo({ ...info, engine: res.version, engineSource: res.source });
      setState('installed');
    } else {
      setState('error');
      setMessage(res.error);
    }
  };

  const reset = async () => {
    const res = await api().resetEngine();
    if (res.ok) {
      onInfo({ ...info, engine: res.version, engineSource: res.source });
      setState('idle');
      setMessage('');
    } else {
      setState('error');
      setMessage(res.error);
    }
  };

  return (
    <section className="set-section">
      <h3>Motor de download (yt-dlp)</h3>
      <p className="muted">
        Versão em uso: <strong>{info?.engine ?? 'não encontrado'}</strong>
        {info?.engineSource && <span> · {SOURCE[info.engineSource]}</span>}
      </p>
      <p className="muted small">YouTube e Instagram mudam com frequência. Se um download parar de funcionar, procure atualização.</p>

      <div className="set-row">
        <button className="ghost" onClick={check} disabled={state === 'checking' || state === 'installing'}>
          {state === 'checking' ? <span className="spinner" /> : <IconRetry width={16} height={16} />}
          {state === 'checking' ? 'Verificando…' : 'Verificar atualização'}
        </button>
        {state === 'available' && (
          <button className="primary" onClick={install}>Baixar e instalar {latest}</button>
        )}
        {info?.engineSource === 'updated' && state !== 'installing' && (
          <button className="ghost small" onClick={reset} title="Volta ao motor que veio no instalador">Restaurar motor original</button>
        )}
      </div>

      {state === 'uptodate' && <p className="ok-msg"><IconCheck width={15} height={15} /> Você já está com a versão mais recente ({latest}).</p>}
      {state === 'available' && <p className="info-msg">Nova versão disponível: <strong>{latest}</strong>.</p>}
      {state === 'installing' && (
        <div>
          <div className="progress"><div style={{ width: `${percent}%` }} /></div>
          <p className="muted small">Baixando e verificando o motor… {Math.floor(percent)}%</p>
        </div>
      )}
      {state === 'installed' && <p className="ok-msg"><IconCheck width={15} height={15} /> Motor atualizado para {info?.engine}. Já está valendo para os próximos downloads.</p>}
      {state === 'error' && <p className="bad-msg"><IconAlert width={15} height={15} /> {message}</p>}
    </section>
  );
}

function InstagramSection({ connected, onConnect, onDisconnect }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const connect = async () => {
    setBusy(true);
    setNote('');
    const ok = await onConnect();
    setBusy(false);
    if (!ok) setNote('Login não concluído. Se fechou a janela antes de entrar, tente de novo.');
  };
  return (
    <section className="set-section">
      <h3>Instagram</h3>
      <p className="muted">
        Reels e posts do Instagram costumam exigir login. Clique em <b>Conectar</b>, entre na sua conta na janela que abrir
        (a página oficial do Instagram) e ela fecha sozinha.
      </p>
      <p className="muted small">
        O Sonora não vê nem guarda a sua senha: fica apenas a sessão neste computador. Use só conteúdo que você pode baixar.
      </p>
      <div className="set-row">
        <span className={`status-pill ${connected ? 'on' : ''}`}>{connected ? '● Conectado' : '○ Não conectado'}</span>
        <button className="primary" onClick={connect} disabled={busy}>
          {busy ? <span className="spinner" /> : null}
          {connected ? 'Reconectar' : 'Conectar Instagram'}
        </button>
        {connected && <button className="ghost small" onClick={onDisconnect}>Desconectar</button>}
      </div>
      {note && <p className="muted small">{note}</p>}
    </section>
  );
}

export default function SettingsDialog({ info, igConnected, onClose, onInfo, onConnect, onDisconnect }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Configurações">
        <div className="modal-head">
          <h2>Configurações</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><IconX width={18} height={18} /></button>
        </div>
        <InstagramSection connected={igConnected} onConnect={onConnect} onDisconnect={onDisconnect} />
        <EngineSection info={info} onInfo={onInfo} />
      </div>
    </div>
  );
}
