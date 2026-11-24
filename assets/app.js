const $ = (s) => document.querySelector(s);
const results = $('#results');
const searchForm = $('#searchForm');
const searchInput = $('#searchInput');
const searchControls = $('#searchControls');
const libraryHeaderTitle = $('#libraryHeaderTitle');
const libraryTopTitle = $('#libraryTopTitle');
const loadMoreWrap = $('#loadMoreWrap');
const loadMoreBtn = $('#loadMoreBtn');
const contentGrid = $('#contentGrid');
const playerPanel = $('#playerPanel');

let currentVideo = null;
let currentView = 'home';
let currentQuery = '';
let nextPageToken = '';
let loadedItems = [];
let hasSearchedOrPlayed = false;

const STORE = { favorites: 'xyro-favorites', history: 'xyro-history' };
const YOUTUBE_API_KEY = 'AIzaSyA2JNPQTSP3IqwFUiH5oPnWa4qIZaregGI';
const MAX_RESULTS_PER_PAGE = 25;

function readStore(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function esc(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function smoothScrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setPlayerVisible(visible) {
  if (visible) {
    playerPanel.classList.remove('is-hidden');
    contentGrid.classList.remove('is-library');
  } else {
    playerPanel.classList.add('is-hidden');
    contentGrid.classList.add('is-library');
  }
}

function setTopbarMode(view) {
  if (view === 'home') {
    searchControls.classList.remove('d-none');
    libraryHeaderTitle.classList.add('d-none');
  } else {
    searchControls.classList.add('d-none');
    libraryHeaderTitle.classList.remove('d-none');
    libraryTopTitle.textContent = view === 'favorites' ? 'Favoritos' : 'Histórico';
  }
}

function videoId(input) {
  const raw = input.trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1).split('/')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/);
    if (m) return m[1];
  } catch {}
  return null;
}

function setEmpty(title, detail) {
  loadMoreWrap.classList.add('d-none');
  results.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="bi bi-search"></i></div><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
}

function cardHtml(v, showHeart = true, index = 0) {
  const isSaved = readStore(STORE.favorites).some(x => x.id === v.id);
  const delay = Math.min(index * 25, 300);
  return `<article class="video-card" data-id="${esc(v.id)}" style="animation-delay: ${delay}ms">
    <button class="thumb" data-play="${esc(v.id)}" aria-label="Reproduzir ${esc(v.title)}">
      <img src="${esc(v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`)}" alt="" loading="lazy">
      <span class="thumb-play"><i class="bi bi-play-fill"></i></span>
    </button>
    <div class="video-info">
      <button class="video-title" data-play="${esc(v.id)}">${esc(v.title)}</button>
      <span>${esc(v.channel || 'Canal')}</span>
    </div>
    ${showHeart ? `<button class="mini-heart ${isSaved ? 'saved' : ''}" data-fav="${esc(v.id)}" title="Favoritar" aria-label="Favoritar"><i class="bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}"></i></button>` : ''}
  </article>`;
}

function renderVideos(items, append = false) {
  if (!append && !items.length) {
    return setEmpty('Nenhum vídeo encontrado', 'Tente outros termos de pesquisa.');
  }
  if (!append) {
    loadedItems = [...items];
    results.innerHTML = items.map((v, i) => cardHtml(v, true, i)).join('');
  } else {
    loadedItems = [...loadedItems, ...items];
    results.insertAdjacentHTML('beforeend', items.map((v, i) => cardHtml(v, true, i)).join(''));
  }

  $('#resultCount').textContent = `${loadedItems.length} vídeos`;
  if (nextPageToken) {
    loadMoreWrap.classList.remove('d-none');
  } else {
    loadMoreWrap.classList.add('d-none');
  }
}

function activateHomeNav() {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === 'home'));
  setTopbarMode('home');
}

async function search(q, pageToken = '') {
  const isAppend = Boolean(pageToken);
  currentView = 'home';
  currentQuery = q;
  hasSearchedOrPlayed = true;

  activateHomeNav();
  setPlayerVisible(true);

  if (!isAppend) {
    nextPageToken = '';
    loadedItems = [];
    loadMoreWrap.classList.add('d-none');
    $('#resultEyebrow').textContent = 'RESULTADOS';
    $('#resultTitle').textContent = `Pesquisa: ${q}`;
    $('#resultCount').textContent = '';
    $('#welcome').classList.add('compact');
    results.innerHTML = '<div class="loading"><div class="spinner-border spinner-border-sm text-light" role="status"></div><span>Buscando vídeos...</span></div>';
  } else {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Carregando...';
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(MAX_RESULTS_PER_PAGE),
      q: q,
      key: YOUTUBE_API_KEY
    });
    if (pageToken) params.set('pageToken', pageToken);

    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await r.json();
    if (!r.ok || data.error) {
      const msg = data.error?.message || `Erro HTTP ${r.status}`;
      throw new Error(`${msg}. Você ainda pode colar um link ou ID de vídeo na barra de pesquisa.`);
    }

    nextPageToken = data.nextPageToken || '';

    const items = (data.items || [])
      .filter(item => item.id?.videoId)
      .map(item => {
        const s = item.snippet || {};
        return {
          id: item.id.videoId,
          title: s.title || 'Vídeo sem título',
          channel: s.channelTitle || '',
          thumbnail: s.thumbnails?.high?.url || s.thumbnails?.medium?.url || '',
          publishedAt: s.publishedAt || ''
        };
      });

    renderVideos(items, isAppend);
  } catch (e) {
    console.error('Erro na pesquisa:', e);
    if (!isAppend) {
      setEmpty('Pesquisa indisponível', `${e.message || 'Falha ao consultar a API.'} (Cole um link ou ID do YouTube para tocar direto)`);
    }
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Carregar mais vídeos';
  }
}

loadMoreBtn.addEventListener('click', () => {
  if (currentQuery && nextPageToken) {
    search(currentQuery, nextPageToken);
  }
});

async function playPastedVideo(id) {
  hasSearchedOrPlayed = true;
  currentView = 'home';
  activateHomeNav();
  $('#welcome').classList.add('compact');
  setPlayerVisible(true);
  playVideo(id, 'Carregando informações...', '');
  try {
    const params = new URLSearchParams({ part: 'snippet', id, key: YOUTUBE_API_KEY });
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
    const data = await r.json();
    const snippet = data.items?.[0]?.snippet;
    if (snippet) {
      playVideo(id, snippet.title, snippet.channelTitle);
    } else {
      playVideo(id, 'Vídeo colado', 'Reprodução incorporada');
    }
  } catch {
    playVideo(id, 'Vídeo colado', 'Reprodução incorporada');
  }
}

function updateFavoriteIcon(btn, isSaved) {
  if (!btn) return;
  btn.classList.toggle('saved', isSaved);
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isSaved ? 'bi bi-heart-fill' : 'bi bi-heart';
  }
}

function playVideo(video, title='Vídeo selecionado', channel='') {
  hasSearchedOrPlayed = true;
  currentVideo = { id: video, title, channel };

  if (currentView !== 'home') {
    currentView = 'home';
    activateHomeNav();
    $('#welcome').classList.add('compact');
    if (loadedItems.length > 0 && currentQuery) {
      $('#resultEyebrow').textContent = 'RESULTADOS';
      $('#resultTitle').textContent = `Pesquisa: ${currentQuery}`;
      renderVideos(loadedItems, false);
    } else {
      $('#resultEyebrow').textContent = 'REPRODUZINDO';
      $('#resultTitle').textContent = 'Player ativo';
      $('#resultCount').textContent = '';
      setEmpty('Pesquise mais vídeos acima', 'Ou navegue pelos seus favoritos e histórico no menu.');
    }
  }

  setPlayerVisible(true);

  $('#videoFrame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}?autoplay=1&rel=0" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  $('#nowTitle').textContent = title;
  $('#nowChannel').textContent = channel || 'Reprodução incorporada';

  const isSaved = readStore(STORE.favorites).some(x => x.id === video);
  updateFavoriteIcon($('#favoriteCurrent'), isSaved);

  const history = readStore(STORE.history).filter(x => x.id !== video);
  history.unshift(currentVideo);
  writeStore(STORE.history, history.slice(0, 50));

  if (window.innerWidth <= 1024) {
    requestAnimationFrame(() => {
      playerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  const id = videoId(q);
  if (id) { playPastedVideo(id); return; }
  search(q);
});

$('#clearSearch').addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
});

results.addEventListener('click', e => {
  const play = e.target.closest('[data-play]');
  const fav = e.target.closest('[data-fav]');
  if (play) {
    const id = play.dataset.play;
    const card = play.closest('.video-card');
    playVideo(id, card?.querySelector('.video-title')?.textContent || 'Vídeo selecionado', card?.querySelector('.video-info span')?.textContent || '');
  }
  if (fav) toggleFavorite(fav.dataset.fav);
});

function toggleFavorite(id) {
  let favs = readStore(STORE.favorites);
  const exists = favs.some(x => x.id === id);
  if (exists) {
    favs = favs.filter(x => x.id !== id);
  } else {
    const card = [...document.querySelectorAll('.video-card')].find(c => c.dataset.id === id);
    const title = card?.querySelector('.video-title')?.textContent || (currentVideo?.id === id ? currentVideo.title : 'Vídeo salvo');
    const channel = card?.querySelector('.video-info span')?.textContent || (currentVideo?.id === id ? currentVideo.channel : '');
    favs.unshift({ id, title, channel });
  }
  writeStore(STORE.favorites, favs);

  const nowSaved = !exists;
  if (currentVideo?.id === id) {
    updateFavoriteIcon($('#favoriteCurrent'), nowSaved);
  }

  if (currentView === 'favorites') {
    showCollection('favorites');
  } else {
    document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach(btn => updateFavoriteIcon(btn, nowSaved));
  }
}

$('#favoriteCurrent').addEventListener('click', () => { if (currentVideo) toggleFavorite(currentVideo.id); });

function showCollection(type) {
  currentView = type;
  setTopbarMode(type);
  setPlayerVisible(false);
  loadMoreWrap.classList.add('d-none');

  const data = readStore(STORE[type]);
  $('#welcome').classList.add('compact');
  $('#resultEyebrow').textContent = 'SUA BIBLIOTECA';
  $('#resultTitle').textContent = type === 'favorites' ? 'Favoritos' : 'Histórico';
  $('#resultCount').textContent = `${data.length} vídeos`;

  if (!data.length) {
    return setEmpty(type === 'favorites' ? 'Sem favoritos ainda' : 'Histórico vazio', 'Os vídeos que você salvar ou assistir aparecerão aqui.');
  }
  results.innerHTML = data.map((v, i) => cardHtml(v, type === 'favorites', i)).join('');
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  smoothScrollTop();

  if (view === 'home') {
    currentView = 'home';
    setTopbarMode('home');

    if (hasSearchedOrPlayed || currentVideo) {
      setPlayerVisible(true);
      $('#welcome').classList.add('compact');
      if (loadedItems.length > 0 && currentQuery) {
        $('#resultEyebrow').textContent = 'RESULTADOS';
        $('#resultTitle').textContent = `Pesquisa: ${currentQuery}`;
        renderVideos(loadedItems, false);
      } else {
        $('#resultEyebrow').textContent = 'EXPLORE';
        $('#resultTitle').textContent = 'Em destaque';
        setEmpty('O que vamos assistir?', 'Use a pesquisa acima para encontrar vídeos.');
        $('#resultCount').textContent = '';
      }
    } else {
      setPlayerVisible(false);
      loadMoreWrap.classList.add('d-none');
      $('#welcome').classList.remove('compact');
      $('#resultEyebrow').textContent = 'EXPLORE';
      $('#resultTitle').textContent = 'Em destaque';
      setEmpty('O que vamos assistir?', 'Use a pesquisa acima para encontrar vídeos.');
      $('#resultCount').textContent = '';
    }
  } else {
    showCollection(view);
  }
}));