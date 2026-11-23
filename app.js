const $ = (s) => document.querySelector(s);
const results = $('#results');
const searchForm = $('#searchForm');
const searchInput = $('#searchInput');
let currentVideo = null;
let currentView = 'home';

const STORE = { favorites: 'xyro-favorites', history: 'xyro-history' };
const YOUTUBE_API_KEY = 'AIzaSyA2JNPQTSP3IqwFUiH5oPnWa4qIZaregGI';

function readStore(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function esc(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

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
  results.innerHTML = `<div class="empty-state"><div class="empty-icon">⌕</div><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
}

function renderVideos(items) {
  if (!items.length) return setEmpty('Nenhum vídeo encontrado', 'Tente outros termos de pesquisa.');
  results.innerHTML = items.map(v => `<article class="video-card" data-id="${esc(v.id)}">
    <button class="thumb" data-play="${esc(v.id)}" aria-label="Reproduzir ${esc(v.title)}"><img src="${esc(v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`)}" alt="" loading="lazy"><span class="thumb-play">▶</span></button>
    <div class="video-info"><button class="video-title" data-play="${esc(v.id)}">${esc(v.title)}</button><span>${esc(v.channel || 'Canal')}</span></div>
    <button class="mini-heart ${readStore(STORE.favorites).some(x=>x.id===v.id)?'saved':''}" data-fav="${esc(v.id)}" title="Favoritar">♡</button>
  </article>`).join('');
  $('#resultCount').textContent = `${items.length} vídeos`;
}

async function search(q) {
  currentView = 'home';
  $('#resultEyebrow').textContent = 'RESULTADOS';
  $('#resultTitle').textContent = `Pesquisa: ${q}`;
  $('#welcome').classList.add('compact');
  results.innerHTML = '<div class="loading"><span class="spinner"></span> Buscando vídeos...</div>';
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '12',
      q: q,
      key: YOUTUBE_API_KEY
    });
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error?.message || 'Falha na pesquisa.');

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

    renderVideos(items);
  } catch (e) {
    setEmpty('Pesquisa indisponível', e.message);
  }
}

async function playPastedVideo(id) {
  $('#welcome').classList.add('compact');
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

function playVideo(video, title='Vídeo selecionado', channel='') {
  currentVideo = { id: video, title, channel };
  $('#videoFrame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}?autoplay=1&rel=0" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  $('#nowTitle').textContent = title;
  $('#nowChannel').textContent = channel || 'Reprodução incorporada';
  $('#favoriteCurrent').classList.toggle('saved', readStore(STORE.favorites).some(x=>x.id===video));
  const history = readStore(STORE.history).filter(x=>x.id!==video);
  history.unshift(currentVideo); writeStore(STORE.history, history.slice(0,40));
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  const id = videoId(q);
  if (id) { playPastedVideo(id); return; }
  search(q);
});

$('#clearSearch').addEventListener('click', () => { searchInput.value=''; searchInput.focus(); });

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
  if (favs.some(x=>x.id===id)) favs = favs.filter(x=>x.id!==id);
  else {
    const card = [...document.querySelectorAll('.video-card')].find(c=>c.dataset.id===id);
    const title = card?.querySelector('.video-title')?.textContent || (currentVideo?.id === id ? currentVideo.title : 'Vídeo salvo');
    const channel = card?.querySelector('.video-info span')?.textContent || (currentVideo?.id === id ? currentVideo.channel : '');
    favs.unshift({ id, title, channel });
  }
  writeStore(STORE.favorites, favs);
  $('#favoriteCurrent').classList.toggle('saved', currentVideo?.id===id && favs.some(x=>x.id===id));
  if (currentView==='favorites') showCollection('favorites');
  else document.querySelector(`[data-fav="${CSS.escape(id)}"]`)?.classList.toggle('saved', favs.some(x=>x.id===id));
}

$('#favoriteCurrent').addEventListener('click', () => { if (currentVideo) toggleFavorite(currentVideo.id); });

function showCollection(type) {
  currentView = type;
  const data = readStore(STORE[type]);
  $('#welcome').classList.add('compact');
  $('#resultEyebrow').textContent = 'SUA BIBLIOTECA';
  $('#resultTitle').textContent = type==='favorites' ? 'Favoritos' : 'Histórico';
  $('#resultCount').textContent = `${data.length} vídeos`;
  if (!data.length) return setEmpty(type==='favorites'?'Sem favoritos ainda':'Histórico vazio', 'Os vídeos que você salvar ou assistir aparecerão aqui.');
  results.innerHTML = data.map(v=>`<article class="video-card" data-id="${esc(v.id)}"><button class="thumb" data-play="${esc(v.id)}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy"><span class="thumb-play">▶</span></button><div class="video-info"><button class="video-title" data-play="${esc(v.id)}">${esc(v.title)}</button><span>${esc(v.channel || 'Vídeo')}</span></div>${type==='favorites'?`<button class="mini-heart saved" data-fav="${esc(v.id)}">♥</button>`:''}</article>`).join('');
}

document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===btn));
  if (btn.dataset.view==='home') { currentView='home'; $('#welcome').classList.remove('compact'); $('#resultEyebrow').textContent='EXPLORE'; $('#resultTitle').textContent='Em destaque'; setEmpty('O que vamos assistir?','Use a pesquisa acima para encontrar vídeos.'); $('#resultCount').textContent=''; }
  else showCollection(btn.dataset.view);
}));