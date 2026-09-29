import { useCallback, useEffect, useRef, useState } from 'react';
import { IconLogo, IconFolder } from './components/Icons.jsx';
import UrlBar from './components/UrlBar.jsx';
import Options from './components/Options.jsx';
import Preview from './components/Preview.jsx';
import Queue from './components/Queue.jsx';

const api = () => window.api;
let seq = 0;
const newJobId = () => `job-${Date.now()}-${++seq}`;

export default function App() {
  const [settings, setSettings] = useState(null);
  const [info, setInfo] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [jobs, setJobs] = useState([]);
  const started = useRef(new Set());

  useEffect(() => {
    api().getSettings().then(setSettings);
    api().info().then(setInfo);
  }, []);

  const patchJob = useCallback((jobId, patch, onlyIfActive = false) => {
    setJobs((list) => list.map((j) => {
      if (j.jobId !== jobId) return j;
      if (onlyIfActive && !['starting', 'downloading', 'converting'].includes(j.status)) return j;
      return { ...j, ...patch };
    }));
  }, []);

  useEffect(() => {
    const offs = [
      api().onProgress(({ jobId, stage, percent, speed, eta }) =>
        patchJob(jobId, stage === 'convert'
          ? { status: 'converting', percent: 100, speed: null, eta: null }
          : { status: 'downloading', ...(percent != null && { percent }), speed, eta }, true)),
      api().onDone(({ jobId, file }) => patchJob(jobId, { status: 'done', percent: 100, file }, true)),
      api().onError(({ jobId, error }) => patchJob(jobId, { status: 'error', error }, true)),
    ];
    return () => offs.forEach((off) => off());
  }, [patchJob]);

  // Fila: inicia os próximos downloads respeitando o limite simultâneo.
  useEffect(() => {
    if (!settings) return;
    const active = jobs.filter((j) => j.status === 'downloading' || j.status === 'converting' || j.status === 'starting').length;
    const free = Math.max(0, (settings.concurrency || 2) - active);
    const next = jobs.filter((j) => j.status === 'queued' && !started.current.has(j.jobId)).slice(0, free);
    for (const job of next) {
      started.current.add(job.jobId);
      patchJob(job.jobId, { status: 'starting', percent: 0 });
      api().startDownload(job.jobId, job.url);
    }
  }, [jobs, settings, patchJob]);

  const updateSettings = async (patch) => setSettings(await api().setSettings(patch));
  const chooseFolder = async () => {
    const next = await api().chooseFolder();
    if (next) setSettings(next);
  };

  const search = async (value = url) => {
    const target = value.trim();
    if (!target) return;
    setLoading(true);
    setError('');
    setPreview(null);
    const res = await api().fetchMedia(target);
    setLoading(false);
    if (res.ok) setPreview(res.data);
    else setError(res.error);
  };

  const enqueue = (tracks) => {
    const known = new Set(jobs.filter((j) => j.status !== 'error' && j.status !== 'cancelled').map((j) => j.url));
    const fresh = tracks.filter((t) => !known.has(t.url)).map((t) => ({ ...t, jobId: newJobId(), status: 'queued', percent: 0 }));
    setJobs((list) => [...fresh, ...list]);
    setPreview(null);
    setUrl('');
  };

  const cancel = (job) => {
    api().cancelDownload(job.jobId);
    patchJob(job.jobId, { status: 'cancelled' });
  };
  const retry = (job) => {
    started.current.delete(job.jobId);
    patchJob(job.jobId, { status: 'queued', error: null, percent: 0 });
  };
  const remove = (job) => setJobs((list) => list.filter((j) => j.jobId !== job.jobId));
  const clearFinished = () => setJobs((list) => list.filter((j) => !['done', 'cancelled', 'error'].includes(j.status)));

  const isMac = api().platform === 'darwin';

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden />
      <header className={`titlebar ${isMac ? 'mac' : ''}`}>
        <div className="brand">
          <IconLogo />
          <span>DLTechSup</span>
          <span className="brand-tag">Baixar Música</span>
        </div>
        <button className="ghost small no-drag" onClick={() => api().openFolder()} title="Abrir pasta de músicas">
          <IconFolder width={16} height={16} /> Minhas músicas
        </button>
      </header>

      <main className="content">
        <section className="hero">
          <h1>
            Suas músicas favoritas, <span className="grad">em MP3.</span>
          </h1>
          <p className="muted">Cole o link de um vídeo ou playlist do YouTube e baixe em alta qualidade.</p>
          <UrlBar value={url} onChange={setUrl} onSubmit={search} loading={loading} />
          {settings && <Options settings={settings} onChange={updateSettings} onChooseFolder={chooseFolder} />}
          {error && <div className="alert">{error}</div>}
        </section>

        {preview && <Preview data={preview} onDownload={enqueue} onClose={() => setPreview(null)} />}

        <Queue
          jobs={jobs}
          onCancel={cancel}
          onRetry={retry}
          onRemove={remove}
          onClear={clearFinished}
          onShow={(job) => api().showFile(job.file)}
        />
      </main>

      <footer className="footer muted">
        <span>v{info?.version ?? '—'}</span>
        <span className="dot" />
        <span>
          Motor yt-dlp {info?.engine ?? <em className="warn">não encontrado</em>}
        </span>
      </footer>
    </div>
  );
}
