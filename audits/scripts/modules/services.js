import { SERVICE_PATTERNS } from './services/config.js';

function getMeta(id = '') {
  for (const p of SERVICE_PATTERNS) {
    if (p.regex.test(id)) return p;
  }
  return { icon: '⚙️', category: 'Autre' };
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function timeAgo(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, s] of units) {
    if (sec >= s) return rtf.format(-Math.floor(sec / s), unit);
  }
  return '';
}

function renderServiceCard(svc = {}) {
  const id = svc.id || svc.unit_name || '—';
  const meta = getMeta(id);
  const category = svc.category || meta.category;
  const catClass = 'cat-' + category.toLowerCase().replace(/[\s/]+/g, '-');
  const state = (svc.state || 'unknown').toLowerCase().replace(/[^a-z-]/g, '-');
  const sinceText = svc.since ? timeAgo(svc.since) : '';
  const unit = svc.unit_name || '—';
  const type = svc.type || '—';
  const desc = svc.description || '—';

  const article = document.createElement('article');
  article.className = 'docker-card service-card';
  article.setAttribute('role', 'group');
  article.setAttribute('aria-label', id);

  const head = document.createElement('div');
  head.className = 'docker-head';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'docker-title';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'docker-icon';
  iconSpan.textContent = meta.icon;
  const nameH3 = document.createElement('h3');
  nameH3.className = 'docker-name';
  nameH3.textContent = id;
  titleDiv.append(iconSpan, nameH3);
  const pill = document.createElement('span');
  pill.className = `status-badge status-${state}`;
  pill.setAttribute('aria-label', state);
  pill.textContent = state;
  head.append(titleDiv, pill);
  article.appendChild(head);

  if (sinceText) {
    const sinceDiv = document.createElement('div');
    sinceDiv.className = 'card-subtle';
    sinceDiv.textContent = `since ${sinceText}`;
    article.appendChild(sinceDiv);
  }

  const metaDiv = document.createElement('div');
  metaDiv.className = 'card-meta';
  const unitSpan = document.createElement('span');
  unitSpan.className = 'meta-item';
  const unitStrong = document.createElement('strong');
  unitStrong.textContent = 'Unité :';
  unitSpan.append(unitStrong, document.createTextNode(' ' + unit));
  const typeSpan = document.createElement('span');
  typeSpan.className = 'badge';
  typeSpan.textContent = type;
  const catSpan = document.createElement('span');
  catSpan.className = `badge ${catClass}`;
  catSpan.textContent = category;
  metaDiv.append(unitSpan, typeSpan, catSpan);
  article.appendChild(metaDiv);

  const descP = document.createElement('p');
  descP.className = 'card-desc';
  descP.title = desc;
  descP.textContent = desc;
  article.appendChild(descP);

  return article;
}

export function renderServices(list = []) {
  const grid = document.getElementById('servicesGrid');
  const empty = document.getElementById('servicesEmpty');
  const countSpan = document.getElementById('servicesCount');
  if (!grid || !empty || !countSpan) return;

  const normalized = (list || []).map((s) =>
    typeof s === 'string' ? { id: s } : s || {}
  );
  const sorted = [...normalized].sort((a, b) => {
    const nameA = a.id ?? a.unit_name ?? '';
    const nameB = b.id ?? b.unit_name ?? '';
    return String(nameA).localeCompare(String(nameB));
  });
  countSpan.textContent = `${sorted.length} service${sorted.length > 1 ? 's' : ''}`;
  if (!sorted.length) {
    grid.textContent = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.textContent = '';
  const frag = document.createDocumentFragment();
  sorted.forEach((svc) => frag.appendChild(renderServiceCard(svc)));
  grid.appendChild(frag);
}

export { renderServiceCard };
