import { iconFor, colorClassCpu, colorClassRam } from './ui.js';
import { createListStore } from './store.js';

export const DockerStore = createListStore({
  sort: 'name',
  filters: new Set(['healthy', 'unhealthy', 'running', 'exited']),
  filterFunc(c) {
    const status = c.health === 'starting' ? 'running' : c.health || c.state;
    return this.filters.has(status) && c.name.toLowerCase().includes(this.search);
  },
  sortFunc(list) {
    if (this.sort === 'cpu') list.sort((a, b) => b.cpu - a.cpu);
    else if (this.sort === 'ram') list.sort((a, b) => b.mem - a.mem);
    else list.sort((a, b) => a.name.localeCompare(b.name));
  },
});
let dockerInit = false;

function formatBytes(b) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return v.toFixed(v < 10 ? 1 : 0) + units[i];
}

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
    const used = formatBytes(item.mem_used_bytes);
    memText = used;
    if (item.mem_limit_bytes) {
      memText += ' / ' + formatBytes(item.mem_limit_bytes);
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
    DockerStore.setSearch(e.target.value);
    renderDockerList();
  });
  sortSel.addEventListener('change', (e) => {
    DockerStore.setSort(e.target.value);
    renderDockerList();
  });
  chips.forEach((ch) => {
    ch.addEventListener('click', () => {
      const f = ch.dataset.filter;
      DockerStore.toggleFilter(f);
      ch.classList.toggle('active');
      renderDockerList();
    });
  });
}

function renderDockerList() {
  const list = DockerStore.getFiltered();
  const grid = document.getElementById('dockerGrid');
  grid.textContent = '';
  if (!list.length) {
    document.getElementById('dockerEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('dockerEmpty').classList.add('hidden');
  const template = document.getElementById('tpl-docker-card');
  const frag = document.createDocumentFragment();
  const updates = [];
  list.forEach((c) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.docker-card');
    const iconSpan = node.querySelector('.docker-icon');
    const nameSpan = node.querySelector('.docker-name');
    const badge = node.querySelector('.status-badge');
    const uptimeDiv = node.querySelector('.docker-uptime');
    const cpuOuter = node.querySelector('.bar-outer.cpu');
    const cpuFill = cpuOuter.querySelector('.fill');
    const cpuValue = cpuOuter.querySelector('.bar-value');
    const ramOuter = node.querySelector('.bar-outer.ram');
    const ramFill = ramOuter.querySelector('.fill');
    const ramValue = ramOuter.querySelector('.bar-value');

    const health = c.health ?? '';
    card.setAttribute(
      'title',
      `CPU ${c.cpu}% — RAM ${c.mem}%${health ? ` — Status ${health}` : ''}`,
    );

    iconSpan.textContent = iconFor(c.name);
    nameSpan.textContent = c.name;
    uptimeDiv.textContent = c.uptime;

    if (health) {
      badge.textContent = health;
      badge.classList.add(`status-${health}`);
    } else {
      badge.remove();
    }

    const cpuColor = colorClassCpu(c.cpu);
    const ramColor = colorClassRam(c.mem);
    const memDisplay = c.memText || `${c.mem}%`;

    cpuFill.classList.add(cpuColor);
    cpuValue.textContent = `${c.cpu}%`;
    ramFill.classList.add(ramColor);
    ramValue.textContent = memDisplay;

    frag.appendChild(node);
    updates.push({ cpuFill, ramFill, cpu: c.cpu, mem: c.mem });
  });
  grid.appendChild(frag);
  requestAnimationFrame(() => {
    updates.forEach(({ cpuFill, ramFill, cpu, mem }) => {
      cpuFill.style.width = cpu + '%';
      ramFill.style.width = mem + '%';
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
  const data = arr.map(parseDocker);
  DockerStore.setData(data);
  renderDockerList();
}
