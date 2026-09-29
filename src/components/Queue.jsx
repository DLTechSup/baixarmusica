import { Cover } from './Preview.jsx';
import { IconAlert, IconCheck, IconFolder, IconMusic, IconRetry, IconTrash, IconX } from './Icons.jsx';
import { formatDuration, formatEta, formatSpeed } from '../format.js';

const LABEL = {
  queued: 'Na fila',
  starting: 'Iniciando…',
  downloading: 'Baixando',
  converting: 'Convertendo para MP3…',
  done: 'Concluído',
  error: 'Erro',
  cancelled: 'Cancelado',
};

function JobRow({ job, onCancel, onRetry, onRemove, onShow }) {
  const active = ['starting', 'downloading', 'converting'].includes(job.status);
  const detail =
    job.status === 'downloading'
      ? [`${Math.floor(job.percent || 0)}%`, formatSpeed(job.speed), job.eta != null && `${formatEta(job.eta)} restantes`].filter(Boolean).join(' · ')
      : job.status === 'error'
        ? job.error
        : LABEL[job.status];

  return (
    <li className={`job ${job.status}`}>
      <Cover src={job.thumbnail} />
      <div className="job-body">
        <div className="job-title ellipsis" title={job.title}>{job.title}</div>
        <div className="job-sub">
          {job.status === 'done' && <IconCheck width={14} height={14} className="ok" />}
          {job.status === 'error' && <IconAlert width={14} height={14} className="bad" />}
          <span className="ellipsis">{detail}</span>
          {job.duration && job.status !== 'error' ? <span className="muted mono">· {formatDuration(job.duration)}</span> : null}
        </div>
        {(active || job.status === 'queued') && (
          <div className={`progress ${job.status === 'converting' || job.status === 'starting' ? 'indeterminate' : ''}`}>
            <div style={{ width: `${job.percent || 0}%` }} />
          </div>
        )}
      </div>
      <div className="job-actions">
        {job.status === 'done' && (
          <button className="icon-btn" title="Mostrar na pasta" onClick={() => onShow(job)}>
            <IconFolder width={17} height={17} />
          </button>
        )}
        {(job.status === 'error' || job.status === 'cancelled') && (
          <button className="icon-btn" title="Tentar novamente" onClick={() => onRetry(job)}>
            <IconRetry width={17} height={17} />
          </button>
        )}
        {active || job.status === 'queued' ? (
          <button className="icon-btn" title="Cancelar" onClick={() => onCancel(job)}>
            <IconX width={17} height={17} />
          </button>
        ) : (
          <button className="icon-btn" title="Remover da lista" onClick={() => onRemove(job)}>
            <IconTrash width={16} height={16} />
          </button>
        )}
      </div>
    </li>
  );
}

export default function Queue({ jobs, onCancel, onRetry, onRemove, onClear, onShow }) {
  const done = jobs.filter((j) => j.status === 'done').length;
  const finished = jobs.filter((j) => ['done', 'error', 'cancelled'].includes(j.status)).length;

  return (
    <section className="queue">
      <div className="section-head">
        <h3>Downloads</h3>
        {jobs.length > 0 && <span className="badge">{done}/{jobs.length}</span>}
        <span className="grow" />
        {finished > 0 && (
          <button className="ghost small" onClick={onClear}>Limpar finalizados</button>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><IconMusic width={26} height={26} /></div>
          <p>Nenhum download ainda.</p>
          <p className="muted">As músicas que você baixar aparecem aqui.</p>
        </div>
      ) : (
        <ul className="jobs">
          {jobs.map((job) => (
            <JobRow key={job.jobId} job={job} onCancel={onCancel} onRetry={onRetry} onRemove={onRemove} onShow={onShow} />
          ))}
        </ul>
      )}
    </section>
  );
}
