import { iconFor, colorClassCpu, colorClassRam } from './ui.js';

let dockerData = [];
let dockerFiltered = [];
let dockerFilters = new Set(['healthy', 'unhealthy', 'running', 'exited']);
let dockerSearch = '';
let dockerSort = 'name';
let dockerInit = false;

function parseDocker(item) {
  if (typeof item === 'string') {
    const name = item.split(' (')[0];
    const info = item.slice(name.length + 2, -1);
    let state = 'running';
    let health = '';
    let uptime = info;
    const m = info.match(/\((healthy|unhealthy|starting)\)/i);
    if (m) {
      health = m[1].toLowerCase();
      uptime = info.replace(/\((healthy|unhealthy|starting)\)/i, '').trim();
    }
    if (/^exited/i.test(info)) {
      state = 'exited';
      health = 'exited';
    }
    if (!health) health = state;
    return { name, state, health, uptime, cpu: 0, mem: 0 };
  }

  const cpu = item.cpu_pct ?? item.cpu;
  const mem = item.mem_pct ?? item.mem;
  let memText = item.mem_text || '';

  if (!memText && item.mem_used_bytes != null) {
    const fmt = (b) => {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let i = 0;
      let v = b;
      while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
      }
      return v.toFixed(v < 10 ? 1 : 0) + units[i];
    };
    const used = fmt(item.mem_used_bytes);
    memText = used;
    if (item.mem_limit_bytes) {
      memText += ' / ' + fmt(item.mem_limit_bytes);
    }
  }

  return {
    name: item.name,
    state: item.state || 'running',
    health: item.health || item.state || 'running',
    uptime: item.uptime || '',
    cpu: Number(cpu) || 0,
    mem: Number(mem) || 0,
    memText,
  };
}

function initDockerUI() {
  if (dockerInit) return;
  dockerInit = true;
  const search = document.getElementById('dockerSearch');
  const sortSel = document.getElementById('dockerSort');
  const chips = document.querySelectorAll('#dockerFilters .chip');
  search.addEventListener('input', (e) => {
    dockerSearch = e.target.value.toLowerCase();
    applyDockerFilters();
  });
  sortSel.addEventListener('change', (e) => {
    dockerSort = e.target.value;
    applyDockerFilters();
  });
  chips.forEach((ch) => {
    ch.addEventListener('click', () => {
      const f = ch.dataset.filter;
      if (dockerFilters.has(f)) dockerFilters.delete(f);
      else dockerFilters.add(f);
      ch.classList.toggle('active');
      applyDockerFilters();
    });
  });
}

function applyDockerFilters() {
  dockerFiltered = dockerData.filter((c) => {
    const status = c.health === 'starting' ? 'running' : c.health || c.state;
    return (
      dockerFilters.has(status) && c.name.toLowerCase().includes(dockerSearch)
    );
  });
  if (dockerSort === 'cpu') dockerFiltered.sort((a, b) => b.cpu - a.cpu);
  else if (dockerSort === 'ram') dockerFiltered.sort((a, b) => b.mem - a.mem);
  else dockerFiltered.sort((a, b) => a.name.localeCompare(b.name));
  renderDockerList();
}

function renderDockerList() {
  const grid = document.getElementById('dockerGrid');
  grid.innerHTML = '';
  if (!dockerFiltered.length) {
    document.getElementById('dockerEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('dockerEmpty').classList.add('hidden');
  dockerFiltered.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'docker-card';
    card.tabIndex = 0;
    const health = c.health ?? '';
    card.title = `CPU ${c.cpu}% — RAM ${c.mem}%${health ? ` — Status ${health}` : ''}`;
    const cpuColor = colorClassCpu(c.cpu);
    const ramColor = colorClassRam(c.mem);
    const icon = iconFor(c.name);
    const badge = health
      ? `<span class="status-badge status-${health}">${health}</span>`
      : '';
    card.innerHTML = `<div class="docker-head"><div class="docker-title"><span class="docker-icon">${icon}</span><span class="docker-name">${c.name}</span></div>${badge}</div><div class="docker-uptime">${c.uptime}</div><div class="docker-bars"><div class="bar-outer cpu"><div class="fill ${cpuColor}"></div><span class="bar-value">${c.cpu}%</span></div><div class="bar-outer ram"><div class="fill ${ramColor}"></div><span class="bar-value">${c.memText || c.mem + '%'}%</span></div></div>`;
    grid.appendChild(card);
    const fills = card.querySelectorAll('.fill');
    requestAnimationFrame(() => {
      fills[0].style.width = c.cpu + '%';
      fills[1].style.width = c.mem + '%';
    });
  });
}

export function renderDocker(list) {
  initDockerUI();
  const arr = Array.isArray(list)
    ? list
    : list && Array.isArray(list.containers)
      ? list.containers
      : [];
  dockerData = arr.map(parseDocker);
  applyDockerFilters();
}
