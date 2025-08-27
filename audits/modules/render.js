export function initMenu() {
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('menuOverlay');
  if (!toggle || !sidebar || !overlay) return;
  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  };
  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  };
  toggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) close();
    else open();
  });
  overlay.addEventListener('click', close);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '--';
}

export function renderMeta(data) {
  if (!data) return;
  setText('hostname', data.hostname || '-');
  setText('generatedValue', data.generated || '--');
  setText('ipLocal', data.ip_local || 'N/A');
  setText('ipPublic', data.ip_pub || 'N/A');
  setText('uptimeValue', data.uptime || '--');
}

export function renderLoad(avg, cpu) {
  const parseValues = (val) => {
    if (!val && val !== 0) return [null, null, null];
    if (Array.isArray(val)) {
      const a = val
        .slice(0, 3)
        .map((x) =>
          typeof x === 'number' ? x : parseFloat(String(x).replace(',', '.')),
        );
      while (a.length < 3) a.push(null);
      return a;
    }
    const m = String(val).match(/\d+(?:[.,]\d+)?/g) || [];
    const out = m.slice(0, 3).map((s) => {
      const n = parseFloat(s.replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    });
    while (out.length < 3) out.push(null);
    return out;
  };
  const dash = '—';
  const formatVal = (v) => (v != null ? v.toFixed(2) : dash);
  const colorFor = (lvl) => {
    if (lvl == null) return 'var(--bar-bg)';
    if (lvl < 0.7) return 'var(--ok)';
    if (lvl <= 1) return 'var(--warn)';
    return 'var(--crit)';
  };
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatVal(v);
  };
  const cores = parseInt(cpu?.cores, 10);
  const max = Number.isFinite(cores) && cores > 0 ? cores : null;
  const [l1, l5, l15] = parseValues(avg);
  setVal('load1Val', l1);
  const gaugeWrap = document.getElementById('loadGauge');
  const gauge = document.getElementById('loadGaugePath');
  if (gaugeWrap && gauge) {
    const title = `Charge moyenne sur 1 minute : ${formatVal(l1)}`;
    gaugeWrap.setAttribute('title', title);
    gaugeWrap.setAttribute('aria-label', title);
    if (l1 != null && max) {
      const level = l1 / max;
      const pct = Math.min(level * 100, 100);
      gaugeWrap.classList.remove('na');
      gaugeWrap.style.setProperty('--load-color', colorFor(level));
      gauge.setAttribute('stroke-dasharray', pct + ' 100');
    } else {
      gaugeWrap.classList.add('na');
      gaugeWrap.style.setProperty('--load-color', 'var(--bar-bg)');
      gauge.setAttribute('stroke-dasharray', '0 100');
    }
  }
  const renderBar = (prefix, val, label) => {
    const card = document.getElementById(prefix + 'Card');
    const fill = document.getElementById(prefix + 'Fill');
    const dot = document.getElementById(prefix + 'Dot');
    const bar = document.getElementById(prefix + 'Bar');
    const valEl = document.getElementById(prefix + 'Val');
    const title = `Charge moyenne sur ${label} minutes : ${formatVal(val)}`;
    card?.setAttribute('title', title);
    card?.setAttribute('aria-label', title);
    if (!card || !fill || !dot || !bar || !valEl) return;
    if (val != null) {
      valEl.textContent = formatVal(val);
      if (max) {
        const level = val / max;
        const pct = level * 100;
        card.classList.remove('na');
        const color = colorFor(level);
        fill.style.background = color;
        dot.style.background = color;
        bar.classList.toggle('overflow', pct > 100);
        fill.style.width = pct + '%';
        return;
      }
    }
    card.classList.add('na');
    if (val == null) valEl.textContent = dash;
    fill.style.width = '0';
    fill.style.background = 'var(--bar-bg)';
    dot.style.background = 'var(--bar-bg)';
    bar.classList.remove('overflow');
  };
  renderBar('load5', l5, '5');
  renderBar('load15', l15, '15');
}

export function renderCpu(cpu) {
  const section = document.getElementById('cpuSection');
  if (!cpu || !section) return;
  section.textContent = '';
  const model = document.createElement('div');
  model.className = 'cpu-model';
  model.textContent = (cpu.model || '').trim();
  section.appendChild(model);
  const frag = document.createDocumentFragment();
  (Array.isArray(cpu.usage) ? cpu.usage : []).forEach((c) => {
    const div = document.createElement('div');
    div.className = 'cpu-core';
    div.textContent = `c${c.core}: ${c.usage}%`;
    frag.appendChild(div);
  });
  section.appendChild(frag);
}

export function renderMemory(mem) {
  const section = document.getElementById('memorySection');
  if (!section || !mem) return;
  section.textContent = '';
  const add = (title, obj) => {
    const div = document.createElement('div');
    div.className = 'mem-card';
    if (!obj) {
      div.textContent = `${title}: N/A`;
    } else {
      div.innerHTML = `<strong>${title}</strong> ${obj.used} / ${obj.total}`;
    }
    section.appendChild(div);
  };
  add('RAM', mem.ram);
  add('Swap', mem.swap);
}

export function renderDisks(disks) {
  const container = document.getElementById('disksContainer');
  if (!container) return;
  container.textContent = '';
  (Array.isArray(disks) ? disks : []).forEach((d) => {
    const div = document.createElement('div');
    div.className = 'disk-card';
    div.innerHTML = `<strong>${d.mountpoint || d.filesystem}</strong> ${d.used} / ${d.size} (${d.used_percent || ''})`;
    container.appendChild(div);
  });
}

function renderTop(list, id, key) {
  const div = document.getElementById(id);
  if (!div) return;
  div.textContent = '';
  (Array.isArray(list) ? list : [])
    .slice(1)
    .forEach((p) => {
      const item = document.createElement('div');
      item.className = 'proc-item';
      item.textContent = `${p.cmd} (${p.pid}) - ${p[key]}%`;
      div.appendChild(item);
    });
}

export function renderTopCpu(list) {
  renderTop(list, 'topCpu', 'cpu');
}

export function renderTopMem(list) {
  renderTop(list, 'topMem', 'mem');
}

export function renderPorts(list) {
  const body = document.getElementById('portsBody');
  if (!body) return;
  body.textContent = '';
  (Array.isArray(list) ? list : []).forEach((p) => {
    const processes = new Set();
    (Array.isArray(p.bindings) ? p.bindings : []).forEach((b) => {
      if (b.process) processes.add(b.process);
    });
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${p.port}</td><td>${(Array.isArray(p.services) ? p.services : []).join(', ')}</td>` +
      `<td>${p.category || ''}</td><td>${(Array.isArray(p.scopes) ? p.scopes : []).join(', ')}</td>` +
      `<td>${Array.from(processes).join(', ')}</td>` +
      `<td>${(Array.isArray(p.bindings) ? p.bindings : []).length}</td><td>${p.risk?.level || ''}</td>`;
    body.appendChild(tr);
  });
  const count = document.getElementById('portsCount');
  if (count) count.textContent = Array.isArray(list) ? list.length : 0;
}

export function renderAudit(data) {
  if (!data) return;
  renderMeta(data);
  renderLoad(data.load_average, data.cpu);
  renderCpu(data.cpu);
  renderMemory(data.memory);
  renderDisks(data.disks);
  renderTopCpu(data.top_cpu);
  renderTopMem(data.top_mem);
  renderPorts(data.ports);
}

