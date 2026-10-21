const api = window.api;
const $ = (id) => document.getElementById(id);

const state = { settings: null, listId: 0, posts: new Map(), selected: new Set(), loading: false, profile: null, queue: [], running: 0 };
const CONCURRENCY = 2;

const fmtNum = (n) => (n == null ? '' : new Intl.NumberFormat('pt-BR').format(n));

function showAlert(msg) {
  $('alert').textContent = msg || '';
  $('alert').hidden = !msg;
}

let toastTimer;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 3500);
}

function renderSettings() {
  const s = state.settings;
  $('btn-folder').textContent = `📁 ${s.outDir}`;
  $('btn-folder').title = s.outDir;
  $('opt-videos').checked = s.videos;
  $('btn-login').textContent = s.loggedIn ? '● Conectado' : 'Login';
  $('btn-login').classList.toggle('on', s.loggedIn);
}

function renderToolbar() {
  const total = state.posts.size;
  const sel = state.selected.size;
  $('toolbar').hidden = total === 0;
  $('empty').hidden = total > 0 || state.loading || Boolean(state.profile);
  $('count').textContent = `${total} ${total === 1 ? 'post' : 'posts'}${sel ? ` · ${sel} selecionado${sel === 1 ? '' : 's'}` : ''}`;
  $('sel-all').checked = total > 0 && sel === total;
  $('btn-dl').disabled = sel === 0;
  $('btn-dl').textContent = sel ? `Baixar ${sel} selecionado${sel === 1 ? '' : 's'}` : 'Baixar selecionadas';
  $('btn-stop').hidden = !state.loading;
  $('loading').hidden = !state.loading;
  $('btn-go').textContent = state.loading ? 'Buscando…' : 'Buscar';
  $('btn-go').disabled = state.loading;
}

function makeCard(post) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.code = post.shortcode;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.alt = post.caption || post.shortcode;
  img.src = post.thumb;
  img.addEventListener('error', () => {
    img.remove();
    thumb.classList.add('broken');
    thumb.textContent = '🖼';
  });
  thumb.append(img);

  const badges = document.createElement('div');
  badges.className = 'badges';
  if (post.count > 1) badges.append(Object.assign(document.createElement('span'), { className: 'badge', textContent: `❐ ${post.count}` }));
  if (post.isVideo) badges.append(Object.assign(document.createElement('span'), { className: 'badge', textContent: '▶ vídeo' }));
  thumb.append(badges);

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'pick';
  check.title = 'Selecionar';
  check.addEventListener('change', () => {
    check.checked ? state.selected.add(post.shortcode) : state.selected.delete(post.shortcode);
    card.classList.toggle('selected', check.checked);
    renderToolbar();
  });
  thumb.addEventListener('click', (e) => {
    if (e.target === check || e.target.closest('.dl')) return;
    check.checked = !check.checked;
    check.dispatchEvent(new Event('change'));
  });

  const dl = document.createElement('button');
  dl.className = 'dl';
  dl.title = 'Baixar este post';
  dl.textContent = '⬇';
  dl.addEventListener('click', () => enqueue([post.shortcode]));

  const state_ = document.createElement('div');
  state_.className = 'status';

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = post.date;
  meta.title = post.caption || '';

  thumb.append(check, dl, state_);
  card.append(thumb, meta);
  return card;
}

function setStatus(code, status, text) {
  const card = document.querySelector(`.card[data-code="${CSS.escape(code)}"]`);
  if (!card) return;
  card.dataset.state = status;
  const el = card.querySelector('.status');
  el.textContent = text || '';
  el.title = status === 'error' ? text : '';
}

function resetGrid() {
  state.posts.clear();
  state.selected.clear();
  state.queue = [];
  $('grid').replaceChildren();
  $('profile').hidden = true;
  state.profile = null;
}

function onProfile(p) {
  state.profile = p;
  $('profile').hidden = false;
  const pic = $('p-pic');
  pic.hidden = !p.picture;
  if (p.picture) pic.src = p.picture;
  $('p-name').textContent = p.single ? `Post de @${p.username}` : `${p.fullName ? `${p.fullName} · ` : ''}@${p.username}`;
  $('p-bio').textContent = p.biography || '';
  $('p-stats').textContent = p.single ? '' : [p.posts != null && `${fmtNum(p.posts)} posts`, p.followers != null && `${fmtNum(p.followers)} seguidores`, p.isPrivate && '🔒 privado'].filter(Boolean).join(' · ');
  $('p-open').onclick = () => api.openLink(`https://www.instagram.com/${p.username}/`);
}

function onListEvent({ listId, event }) {
  if (listId !== state.listId) return;
  if (event.type === 'profile') onProfile(event);
  else if (event.type === 'post') {
    if (state.posts.has(event.shortcode)) return;
    state.posts.set(event.shortcode, event);
    $('grid').append(makeCard(event));
    renderToolbar();
  } else if (event.type === 'done') {
    state.loading = false;
    if (state.posts.size === 0) showAlert('Nenhuma foto encontrada.');
    renderToolbar();
  } else if (event.type === 'error') {
    state.loading = false;
    showAlert(event.message);
    if (event.code === 'login' || event.code === 'bad_session') $('btn-login').classList.add('attention');
    renderToolbar();
  }
}

async function search(value = $('url').value) {
  const target = value.trim();
  if (!target || state.loading) return;
  showAlert('');
  resetGrid();
  state.listId += 1;
  state.loading = true;
  renderToolbar();
  await api.startList(state.listId, target);
}

// Fila de downloads (poucos em paralelo para não irritar o Instagram).
function enqueue(codes) {
  for (const code of codes) {
    const card = document.querySelector(`.card[data-code="${CSS.escape(code)}"]`);
    const st = card?.dataset.state;
    if (!card || st === 'queued' || st === 'downloading') continue;
    setStatus(code, 'queued', 'Na fila');
    state.queue.push(code);
  }
  pump();
}

async function pump() {
  while (state.running < CONCURRENCY && state.queue.length) {
    const code = state.queue.shift();
    state.running += 1;
    setStatus(code, 'downloading', 'Baixando…');
    api.download(code).then((r) => {
      if (r.ok && r.files.length) setStatus(code, 'done', `✔ ${r.files.length} ${r.files.length === 1 ? 'arquivo' : 'arquivos'}`);
      else if (r.ok) setStatus(code, 'done', 'Só vídeo (ignorado)');
      else setStatus(code, 'error', r.error || 'Falha');
    }).finally(() => {
      state.running -= 1;
      if (!state.queue.length && state.running === 0) toast('Downloads finalizados.');
      pump();
    });
  }
}

// Eventos da interface
$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  search();
});
$('btn-paste').addEventListener('click', async () => {
  const text = (await api.readClipboard())?.trim();
  if (!text) return;
  $('url').value = text;
  search(text);
});
$('btn-stop').addEventListener('click', () => {
  api.cancelList(state.listId);
  state.loading = false;
  renderToolbar();
});
$('sel-all').addEventListener('change', (e) => {
  for (const card of document.querySelectorAll('.card')) {
    const box = card.querySelector('.pick');
    box.checked = e.target.checked;
    card.classList.toggle('selected', e.target.checked);
    e.target.checked ? state.selected.add(card.dataset.code) : state.selected.delete(card.dataset.code);
  }
  renderToolbar();
});
$('btn-dl').addEventListener('click', () => enqueue([...state.selected]));
$('btn-folder').addEventListener('click', async () => {
  const next = await api.chooseFolder();
  if (next) {
    state.settings = next;
    renderSettings();
  }
});
$('btn-open').addEventListener('click', () => api.openFolder());
$('opt-videos').addEventListener('change', async (e) => {
  state.settings = await api.setSettings({ videos: e.target.checked });
  renderSettings();
});

// Login por cookie
const dlg = $('dlg-login');
$('btn-login').addEventListener('click', () => {
  $('cookie').value = '';
  $('dlg-logout').hidden = !state.settings.loggedIn;
  $('cookie').placeholder = state.settings.loggedIn ? 'Conectado — cole outro valor para trocar' : 'Valor do sessionid';
  dlg.showModal();
});
dlg.querySelector('[data-link]').addEventListener('click', (e) => {
  e.preventDefault();
  api.openLink(e.target.dataset.link);
});
$('dlg-cancel').addEventListener('click', () => dlg.close());
$('dlg-save').addEventListener('click', async () => {
  const value = $('cookie').value.trim();
  if (!value) return dlg.close();
  state.settings = await api.setSettings({ cookie: value });
  renderSettings();
  $('btn-login').classList.remove('attention');
  dlg.close();
  toast('Login salvo. Busque o perfil de novo.');
});
$('dlg-logout').addEventListener('click', async () => {
  state.settings = await api.setSettings({ cookie: '' });
  renderSettings();
  dlg.close();
  toast('Você saiu da conta.');
});

api.onListEvent(onListEvent);

(async () => {
  state.settings = await api.getSettings();
  renderSettings();
  renderToolbar();
  const info = await api.info();
  $('ver').textContent = `InstaFotos v${info.version}`;
  $('eng').textContent = info.engine ? `Motor Instaloader ${info.engine}` : 'Motor não encontrado';
})();
