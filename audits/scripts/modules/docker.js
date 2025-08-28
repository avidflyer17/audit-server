import { iconFor, colorClassCpu, colorClassRam } from './ui.js';

export const DockerStore = {
  data: [],
  filtered: [],
  filters: new Set(['healthy', 'unhealthy', 'running', 'exited']),
  search: '',
  sort: 'name',
  setData(arr) {
    this.data = arr;
    return this.applyFilters();
  },
  setSearch(val) {
    this.search = val.toLowerCase();
    return this.applyFilters();
  },
  setSort(val) {
    this.sort = val;
    return this.applyFilters();
  },
  toggleFilter(f) {
    if (this.filters.has(f)) this.filters.delete(f);
    else this.filters.add(f);
    return this.applyFilters();
  },
  applyFilters() {
    this.filtered = this.data.filter((c) => {
      const status = c.health === 'starting' ? 'running' : c.health || c.state;
      return (
        this.filters.has(status) &&
        c.name.toLowerCase().includes(this.search)
      );
    });
    if (this.sort === 'cpu') this.filtered.sort((a, b) => b.cpu - a.cpu);
    else if (this.sort === 'ram') this.filtered.sort((a, b) => b.mem - a.mem);
    else this.filtered.sort((a, b) => a.name.localeCompare(b.name));
    return this.filtered;
  },
  getFiltered() {
    return this.filtered;
  },
};

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
  const frag = document.createDocumentFragment();
  const updates = [];
  list.forEach((c) => {
    const card = document.createElement('div');
    card.setAttribute('class', 'docker-card');
    card.setAttribute('tabindex', '0');
    const health = c.health ?? '';
    card.setAttribute(
      'title',
      `CPU ${c.cpu}% — RAM ${c.mem}%${health ? ` — Status ${health}` : ''}`,
    );
    const cpuColor = colorClassCpu(c.cpu);
    const ramColor = colorClassRam(c.mem);
    const icon = iconFor(c.name);
    const memDisplay = c.memText || `${c.mem}%`;

    const head = document.createElement('div');
    head.setAttribute('class', 'docker-head');

    const title = document.createElement('div');
    title.setAttribute('class', 'docker-title');

    const iconSpan = document.createElement('span');
    iconSpan.setAttribute('class', 'docker-icon');
    iconSpan.textContent = icon;

    const nameSpan = document.createElement('span');
    nameSpan.setAttribute('class', 'docker-name');
    nameSpan.textContent = c.name;

    title.appendChild(iconSpan);
    title.appendChild(nameSpan);
    head.appendChild(title);

    if (health) {
      const badge = document.createElement('span');
      badge.setAttribute('class', `status-badge status-${health}`);
      badge.textContent = health;
      head.appendChild(badge);
    }

    const uptimeDiv = document.createElement('div');
    uptimeDiv.setAttribute('class', 'docker-uptime');
    uptimeDiv.textContent = c.uptime;

    const bars = document.createElement('div');
    bars.setAttribute('class', 'docker-bars');

    const cpuOuter = document.createElement('div');
    cpuOuter.setAttribute('class', 'bar-outer cpu');
    const cpuFill = document.createElement('div');
    cpuFill.classList.add('fill', cpuColor);
    const cpuValue = document.createElement('span');
    cpuValue.setAttribute('class', 'bar-value');
    cpuValue.textContent = `${c.cpu}%`;
    cpuOuter.appendChild(cpuFill);
    cpuOuter.appendChild(cpuValue);

    const ramOuter = document.createElement('div');
    ramOuter.setAttribute('class', 'bar-outer ram');
    const ramFill = document.createElement('div');
    ramFill.classList.add('fill', ramColor);
    const ramValue = document.createElement('span');
    ramValue.setAttribute('class', 'bar-value');
    ramValue.textContent = memDisplay;
    ramOuter.appendChild(ramFill);
    ramOuter.appendChild(ramValue);

    bars.appendChild(cpuOuter);
    bars.appendChild(ramOuter);

    card.appendChild(head);
    card.appendChild(uptimeDiv);
    card.appendChild(bars);

    frag.appendChild(card);
    updates.push({ fills: [cpuFill, ramFill], cpu: c.cpu, mem: c.mem });
  });
  grid.appendChild(frag);
  requestAnimationFrame(() => {
    updates.forEach(({ fills, cpu, mem }) => {
      fills[0].style.width = cpu + '%';
      fills[1].style.width = mem + '%';
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
