import { renderServices } from './modules/services.js';
import { renderDocker } from './modules/docker.js';
import { renderAudit, initMenu } from './modules/render.js';

export let auditsIndex = [];
export let auditsMap = {};
export let latestEntry = null;

export async function fetchIndex() {
  const res = await fetch('/archives/index.json');
  return await res.json();
}

export async function loadAudit(file) {
  const res = await fetch('/archives/' + file);
  if (!res.ok) throw new Error('Fichier inaccessible');
  return await res.json();
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

export function showStatus(message, type) {
  const div = document.getElementById('selectorStatus');
  div.className = type || '';
  div.textContent = message || '';
}

async function loadAndRender(file) {
  try {
    showStatus('Chargement…', 'loading');
    const data = await loadAudit(file);
    renderAudit(data);
    renderServices(data.services || []);
    renderDocker(data.docker || []);
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports', 'error');
  }
}

function selectDay(date, activeTime) {
  const timeline = document.getElementById('timeTimeline');
  timeline.textContent = '';
  const list = auditsMap[date];
  if (!list || list.length === 0) {
    showStatus('Aucun rapport', 'empty');
    return;
  }
  list.forEach((entry) => {
    const chip = document.createElement('button');
    chip.className = 'time-chip';
    chip.textContent = entry.time;
    if (entry.time === activeTime) chip.classList.add('active');
    chip.addEventListener('click', () => {
      document
        .querySelectorAll('#timeTimeline .time-chip')
        .forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      loadAndRender(entry.file);
    });
    timeline.appendChild(chip);
  });
  showStatus('');
}

function setupSelector() {
  const btnLatest = document.getElementById('btnLatest');
  const latestInfo = document.getElementById('latestInfo');
  const dayToday = document.getElementById('dayToday');
  const dayYesterday = document.getElementById('dayYesterday');
  const dayCalendar = document.getElementById('dayCalendar');
  const datePicker = document.getElementById('datePicker');
  const buttons = [dayToday, dayYesterday, dayCalendar];
  const setActiveDay = (btn) => {
    buttons.forEach((b) => b && b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  };
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const yestStr = yest.toISOString().slice(0, 10);
  if (latestEntry && latestInfo)
    latestInfo.textContent = `${latestEntry.date} ${latestEntry.time}`;
  btnLatest?.addEventListener('click', () => {
    selectDay(latestEntry.date, latestEntry.time);
    setActiveDay(
      latestEntry.date === todayStr
        ? dayToday
        : latestEntry.date === yestStr
          ? dayYesterday
          : dayCalendar,
    );
    loadAndRender(latestEntry.file);
  });
  dayToday?.addEventListener('click', () => {
    selectDay(todayStr);
    setActiveDay(dayToday);
  });
  dayYesterday?.addEventListener('click', () => {
    selectDay(yestStr);
    setActiveDay(dayYesterday);
  });
  dayCalendar?.addEventListener('click', () => {
    if (datePicker.showPicker) datePicker.showPicker();
    else datePicker.click();
  });
  datePicker?.addEventListener('change', (e) => {
    selectDay(e.target.value);
    setActiveDay(dayCalendar);
  });
  selectDay(latestEntry.date, latestEntry.time);
  if (latestEntry.date === todayStr) setActiveDay(dayToday);
  else if (latestEntry.date === yestStr) setActiveDay(dayYesterday);
  else setActiveDay(dayCalendar);
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
    setupSelector();
    await loadAndRender(latestEntry.file);
    initMenu();
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports', 'error');
  }
}
