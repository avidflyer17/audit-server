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
  const icon = meta.icon;
  const category = svc.category || meta.category;
  const catClass = 'cat-' + category.toLowerCase().replace(/[\s/]+/g, '-');
  const state = (svc.state || 'unknown').toLowerCase().replace(/[^a-z-]/g, '-');
  const sinceText = svc.since ? timeAgo(svc.since) : '';
  const unit = svc.unit_name || '—';
  const type = svc.type || '—';
  const desc = svc.description || '—';
  const sinceHtml = sinceText ? `<div class="card-subtle">since ${sinceText}</div>` : '';
  return `<article class="docker-card service-card" role="group" aria-label="${id}">
    <div class="docker-head">
      <div class="docker-title"><span class="docker-icon">${icon}</span><h3 class="docker-name">${id}</h3></div>
      <span class="status-badge status-${state}" aria-label="${state}">${state}</span>
    </div>
    ${sinceHtml}
    <div class="card-meta">
      <span class="meta-item"><strong>Unité :</strong> ${unit}</span>
      <span class="badge">${type}</span>
      <span class="badge ${catClass}">${category}</span>
    </div>
    <p class="card-desc" title="${desc}">${desc}</p>
  </article>`;
}

export function renderServices(list = []) {
  const grid = document.getElementById('servicesGrid');
  const empty = document.getElementById('servicesEmpty');
  const countSpan = document.getElementById('servicesCount');
  if (!grid || !empty || !countSpan) return;
  const sorted = [...list].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  countSpan.textContent = `${sorted.length} service${sorted.length > 1 ? 's' : ''}`;
  if (!sorted.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = sorted.map(renderServiceCard).join('');
}

export { renderServiceCard };
