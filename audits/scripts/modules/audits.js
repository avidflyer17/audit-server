import { renderServices } from './services.js';
import { renderDocker } from './docker.js';
import { parseIndex, getLatest, groupByDay } from './timeline.js';

export let auditsIndex = [];
export let auditsMap = {};
export let latestEntry = null;

export async function fetchIndex() {
  const res = await fetch('archives/index.json');
  return await res.json();
}

export async function loadAudit(file) {
  const res = await fetch('archives/' + file);
  if (!res.ok) throw new Error('Fichier inaccessible');
  return await res.json();
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
    auditsIndex = list || [];
    const parsed = parseIndex(list);
    auditsMap = Object.fromEntries(groupByDay(parsed));
    latestEntry = getLatest(parsed);
    if (!latestEntry) {
      showStatus('Aucun rapport', 'empty');
      return;
    }
    const data = await loadAudit(latestEntry.path);
    renderServices(data.services || []);
    renderDocker(data.docker || []);
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports', 'error');
  }
}
