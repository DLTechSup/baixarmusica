import { IconLogo } from './Icons.jsx';

export default function Notice({ onAccept }) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="notice-title">
        <IconLogo width={44} height={44} />
        <h2 id="notice-title">Este navegador é feito só para o Instagram</h2>
        <p className="muted">
          O InstaNavegador serve para <strong>baixar fotos, vídeos e Reels</strong> do Instagram. Entre na sua conta
          e navegue como no site normal.
        </p>
        <ol className="steps">
          <li><b>Entre</b> na sua conta do Instagram (o login fica salvo só neste programa).</li>
          <li><b>Passe o mouse</b> sobre uma foto, vídeo ou Reel e clique em <span className="pill">⬇ Baixar</span>.</li>
          <li>Ou use o painel <b>Mídias</b> para baixar várias de uma vez.</li>
        </ol>
        <p className="small muted">
          Baixe apenas conteúdo seu ou que você tenha permissão para baixar. Este programa não tem relação com o
          Instagram/Meta.
        </p>
        <button className="primary big" onClick={onAccept}>Entendi, vamos começar</button>
      </div>
    </div>
  );
}
