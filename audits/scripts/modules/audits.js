import { renderServices } from './services.js';
import { renderDocker } from './docker.js';

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
    const data = await loadAudit(latestEntry.file);
    renderServices(data.services || []);
    renderDocker(data.docker || []);
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports: ' + err.message, 'error');
  }
}
