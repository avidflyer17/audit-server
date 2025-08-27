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

export function renderLoad(avg) {
  const parts = (avg || '').split(',').map((s) => s.trim());
  const [l1, l5, l15] = [parts[0], parts[1], parts[2]];
  setText('load1Val', l1 || '--');
  setText('load5Val', l5 || '--');
  setText('load15Val', l15 || '--');
  const gauge = document.getElementById('loadGaugePath');
  if (gauge && l1) {
    const pct = Math.min(parseFloat(l1) * 10, 100);
    gauge.setAttribute('stroke-dasharray', pct + ' 100');
  }
  const fill5 = document.getElementById('load5Fill');
  if (fill5 && l5) fill5.style.width = Math.min(parseFloat(l5) * 10, 100) + '%';
  const fill15 = document.getElementById('load15Fill');
  if (fill15 && l15) fill15.style.width = Math.min(parseFloat(l15) * 10, 100) + '%';
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
  (cpu.usage || []).forEach((c) => {
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
  (disks || []).forEach((d) => {
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
  (list || []).slice(1).forEach((p) => {
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
  (list || []).forEach((p) => {
    const processes = new Set();
    (p.bindings || []).forEach((b) => {
      if (b.process) processes.add(b.process);
    });
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${p.port}</td><td>${(p.services || []).join(', ')}</td>` +
      `<td>${p.category || ''}</td><td>${(p.scopes || []).join(', ')}</td>` +
      `<td>${Array.from(processes).join(', ')}</td>` +
      `<td>${(p.bindings || []).length}</td><td>${p.risk?.level || ''}</td>`;
    body.appendChild(tr);
  });
  const count = document.getElementById('portsCount');
  if (count) count.textContent = list ? list.length : 0;
}

export function renderAudit(data) {
  renderMeta(data);
  renderLoad(data.load_average);
  renderCpu(data.cpu);
  renderMemory(data.memory);
  renderDisks(data.disks);
  renderTopCpu(data.top_cpu);
  renderTopMem(data.top_mem);
  renderPorts(data.ports);
}

