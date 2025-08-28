import { renderServices } from './services.js';
import { renderDocker } from './docker.js';

function renderInfo(data = {}) {
  const hostname = document.getElementById('hostname');
  const generated = document.getElementById('generatedValue');
  const ipLocal = document.getElementById('ipLocal');
  const ipPublic = document.getElementById('ipPublic');
  const uptime = document.getElementById('uptimeValue');
  if (hostname) hostname.textContent = data.hostname || '-';
  if (generated) generated.textContent = data.generated || '--';
  if (ipLocal) ipLocal.textContent = data.ip_local || 'N/A';
  if (ipPublic) ipPublic.textContent = data.ip_pub || 'N/A';
  if (uptime) uptime.textContent = data.uptime || '--';
}

export let auditsIndex = [];
export let auditsMap = {};
export let latestEntry = null;

export async function fetchIndex() {
  const res = await fetch('/archives/index.json');
  if (!res.ok) throw new Error(`Index inaccessible (${res.status})`);
  return await res.json();
}

export async function loadAudit(file) {
  try {
    const res = await fetch('/archives/' + file);
    if (!res.ok) throw new Error(`Fichier inaccessible (${res.status})`);
    try {
      return await res.json();
    } catch (err) {
      throw new Error('JSON invalide: ' + err.message);
    }
  } catch (err) {
    console.error('loadAudit error:', err);
    throw err;
  }
}

export function parseIndex(list) {
  auditsIndex = list || [];
  auditsMap = {};
  latestEntry = null;
  auditsIndex.forEach((file) => {
    const match = file.match(/audit_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json/);
    if (!match) return;
    const date = match[1];
    const time = match[2].replace('-', ':');
    const iso = new Date(`${date}T${time}:00`);
    const entry = { file, time, iso, date };
    if (!auditsMap[date]) auditsMap[date] = [];
    auditsMap[date].push(entry);
    if (!latestEntry || iso > latestEntry.iso) latestEntry = entry;
  });
  Object.keys(auditsMap).forEach((d) =>
    auditsMap[d].sort((a, b) => a.iso - b.iso),
  );
  return auditsMap;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (open) sidebar.classList.add('open');
  else sidebar.classList.remove('open');
}

async function loadAndRender(entry) {
  try {
    showStatus('Chargement…', 'loading');
    const data = await loadAudit(entry.file);
    renderInfo(data);
    renderServices(data.services || []);
    renderDocker(data.docker || []);
    showStatus('');
    const chips = document.querySelectorAll('.time-chip');
    chips.forEach((c) => c.classList.remove('active'));
    const active = Array.from(chips).find((c) => c.textContent === entry.time);
    if (active) active.classList.add('active');
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger le rapport: ' + err.message, 'error');
  }
}

function selectDay(dateStr) {
  const timeline = document.getElementById('timeTimeline');
  if (!timeline) return;
  timeline.textContent = '';
  document.querySelectorAll('.day-control .seg').forEach((b) => b.classList.remove('active'));
  const today = fmtDate(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = fmtDate(y);
  const btnToday = document.getElementById('dayToday');
  const btnYest = document.getElementById('dayYesterday');
  if (dateStr === today) btnToday?.classList.add('active');
  else if (dateStr === yesterday) btnYest?.classList.add('active');
  const entries = auditsMap[dateStr] || [];
  if (!entries.length) {
    showStatus('Aucun rapport pour ce jour', 'empty');
    return;
  }
  showStatus('');
  entries.forEach((entry) => {
    const btn = document.createElement('button');
    btn.className = 'time-chip';
    btn.textContent = entry.time;
    btn.addEventListener('click', () => {
      loadAndRender(entry);
      toggleSidebar(false);
    });
    timeline.appendChild(btn);
  });
}

function initNav() {
  const menuToggle = document.getElementById('menuToggle');
  const overlay = document.getElementById('menuOverlay');
  menuToggle?.addEventListener('click', () => toggleSidebar(true));
  overlay?.addEventListener('click', () => toggleSidebar(false));

  const btnLatest = document.getElementById('btnLatest');
  const latestInfo = document.getElementById('latestInfo');
  if (btnLatest && latestEntry) {
    const when = latestEntry.iso.toLocaleString();
    if (latestInfo) latestInfo.textContent = when;
    btnLatest.addEventListener('click', () => {
      selectDay(latestEntry.date);
      loadAndRender(latestEntry);
      toggleSidebar(false);
    });
  }

  const dayToday = document.getElementById('dayToday');
  const dayYesterday = document.getElementById('dayYesterday');
  const dayCalendar = document.getElementById('dayCalendar');
  const datePicker = document.getElementById('datePicker');
  const todayStr = fmtDate(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterdayStr = fmtDate(y);
  dayToday?.addEventListener('click', () => selectDay(todayStr));
  dayYesterday?.addEventListener('click', () => selectDay(yesterdayStr));
  dayCalendar?.addEventListener('click', () =>
    datePicker?.showPicker ? datePicker.showPicker() : datePicker?.click(),
  );
  datePicker?.addEventListener('change', () => selectDay(datePicker.value));

  selectDay(latestEntry.date);
}

export function showStatus(message, type) {
  const div = document.getElementById('selectorStatus');
  div.className = type || '';
  div.textContent = message || '';
}

export async function init() {
  try {
    showStatus('Chargement…', 'loading');
    const list = await fetchIndex();
    parseIndex(list);
    if (!latestEntry) {
      showStatus('Aucun rapport', 'empty');
      return;
    }
    initNav();
    await loadAndRender(latestEntry);
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports: ' + err.message, 'error');
  }
}
