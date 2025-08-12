let cpuChartInstance = null;
let memoryChartInstance = null;

let auditsIndex = [];
let auditsMap = {};
let latestEntry = null;
let currentFile = null;
let selectedDate = null;

async function fetchIndex() {
  const res = await fetch('/archives/index.json');
  return await res.json();
}

async function loadAudit(file) {
  try {
    const res = await fetch('/archives/' + file);
    if (!res.ok) throw new Error('Fichier inaccessible');
    return await res.json();
  } catch (err) {
    console.error('Erreur chargement :', err);
    alert("Erreur lors du chargement de l'audit !");
    return null;
  }
}

function parseIndex(list) {
  auditsIndex = list || [];
  auditsMap = {};
  latestEntry = null;
  auditsIndex.forEach(file => {
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
  Object.keys(auditsMap).forEach(d => auditsMap[d].sort((a, b) => a.iso - b.iso));
  return auditsMap;
}

function formatRelative(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(navigator.language, { numeric: 'auto' });
  return rtf.format(-minutes, 'minute');
}

function showStatus(message, type) {
  const div = document.getElementById('selectorStatus');
  div.className = type || '';
  if (type === 'loading') {
    div.innerHTML = `<div class="skeleton"></div> ${message}`;
  } else if (type === 'error') {
    div.innerHTML = `${message} <button id="retryBtn" class="btn">Réessayer</button>`;
    document.getElementById('retryBtn').addEventListener('click', init);
  } else if (type === 'empty') {
    div.textContent = message;
  } else {
    div.textContent = message || '';
  }
}

function renderTimeline(list) {
  const timeline = document.getElementById('timeTimeline');
  timeline.innerHTML = '';
  list.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'time-chip';
    btn.textContent = item.time;
    btn.dataset.file = item.file;
    btn.dataset.iso = item.iso.toISOString();
    btn.title = `${item.time} — ${formatRelative(item.iso)}`;
    btn.addEventListener('click', () => selectTime(item.file));
    timeline.appendChild(btn);
  });
}

function populateDay(day) {
  const list = auditsMap[day] || [];
  if (list.length === 0) {
    renderTimeline([]);
    showStatus('Aucune heure disponible', 'empty');
    return null;
  }
  showStatus('');
  renderTimeline(list);
  const last = list[list.length - 1];
  setActiveTime(last.file);
  return last.file;
}

function setActiveTime(file) {
  document.querySelectorAll('.time-chip').forEach(b => b.classList.toggle('active', b.dataset.file === file));
}

async function selectTime(file) {
  const json = await loadAudit(file);
  if (json) {
    currentFile = file;
    renderCpuChart(json.cpu.usage);
    renderText(json);
    setActiveTime(file);
  }
}

function updateDayButtons() {
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  document.getElementById('dayToday').classList.toggle('active', selectedDate === today);
  document.getElementById('dayYesterday').classList.toggle('active', selectedDate === yesterday);
  document.getElementById('dayCalendar').classList.toggle('active', selectedDate !== today && selectedDate !== yesterday);
}

function showUpdateBadge() {
  const badge = document.getElementById('updateBadge');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 1000);
}

function renderCpuChart(usages) {
  const ctx = document.getElementById('cpuChart').getContext('2d');
  if (cpuChartInstance) cpuChartInstance.destroy();

  cpuChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: usages.map(u => 'CPU ' + u.core),
      datasets: [{
        label: 'Utilisation (%)',
        data: usages.map(u => parseFloat(u.usage)),
        backgroundColor: 'rgba(100, 181, 246, 0.7)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });
}

function formatLoadAverage(value) {
  if (!value) return '--';
  const parts = value.split(',');
  if (parts.length >= 6) {
    const formatted = [];
    for (let i = 0; i < 6; i += 2) {
      formatted.push(parts[i] + ',' + parts[i + 1]);
    }
    return `1 min: ${formatted[0]} | 5 min: ${formatted[1]} | 15 min: ${formatted[2]}`;
  }
  return value;
}

function renderText(json) {
  document.getElementById('generated').textContent = json.generated;
  document.getElementById('hostname').textContent = json.hostname;
  document.getElementById('ipLocal').textContent = json.ip_local || '--';
  document.getElementById('ipPublic').textContent = json.ip_pub || '--';
  document.getElementById('uptime').textContent = json.uptime || '--';
  document.getElementById('loadAvg').textContent = formatLoadAverage(json.load_average);

  const mem = json.memory?.ram;
  if (mem) {
    const total = parseFloat(mem.total);
    const used = parseFloat(mem.used);
    const free = parseFloat(mem.free);

    const memCtx = document.getElementById('memoryChart').getContext('2d');
    if (memoryChartInstance) memoryChartInstance.destroy();

    memoryChartInstance = new Chart(memCtx, {
      type: 'pie',
      data: {
        labels: ['Utilisée', 'Libre'],
        datasets: [{
          data: [used, free],
          backgroundColor: ['#ff9800', '#4caf50']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#fff',
              font: { size: 14 }
            }
          }
        }
      }
    });
  }

  const disksContainer = document.getElementById("disksContainer");
  disksContainer.innerHTML = "";
  if (json.disks && json.disks.length > 0) {
    json.disks.forEach(disk => {
      const usedPercent = parseInt(disk.used_percent);
      let colorClass = "green";
      if (usedPercent > 80) colorClass = "red";
      else if (usedPercent > 50) colorClass = "orange";

      const bar = `
        <div style="margin-bottom: 1rem;">
          <strong>${disk.mountpoint}</strong> – ${disk.used} / ${disk.size} (${disk.available} libre)
          <div class="disk-bar">
            <div class="disk-bar-fill ${colorClass}" style="width: ${usedPercent}%">
              ${usedPercent}%
            </div>
          </div>
        </div>
      `;

      disksContainer.innerHTML += bar;
    });
  } else {
    disksContainer.innerHTML = "<p>Aucun disque détecté.</p>";
  }

  const tempsContainer = document.getElementById("tempsContainer");
  tempsContainer.innerHTML = "";
  const temps = json.cpu?.temperatures;
  if (Array.isArray(temps) && temps.length > 0) {
    temps.forEach(t => {
      const value = parseFloat(t.temp);
      const wrapper = document.createElement("div");
      wrapper.className = "temp-wrapper";

      const label = document.createElement("span");
      label.textContent = `Core ${t.core}: ${isNaN(value) ? "N/A" : value.toFixed(1) + "°C"}`;
      wrapper.appendChild(label);

      const bar = document.createElement("div");
      bar.className = "temp-bar";
      const fill = document.createElement("div");
      fill.className = "temp-fill";
      if (!isNaN(value)) {
        const percentage = Math.min(100, Math.max(0, value));
        fill.style.width = percentage + "%";
        // Color zones: 0-80°C green, 80-95°C orange, 95°C+ red
        if (value < 80) {
          fill.classList.add("green");
        } else if (value < 95) {
          fill.classList.add("orange");
        } else {
          fill.classList.add("red");
        }
      }
      bar.appendChild(fill);
      wrapper.appendChild(bar);
      tempsContainer.appendChild(wrapper);
    });
  } else {
    tempsContainer.textContent = "N/A";
  }

  const badge = document.getElementById('cpuLoadBadge');
  const color = json.cpu_load_color ? json.cpu_load_color.toLowerCase() : "";
  badge.textContent = json.cpu_load_color?.toUpperCase() || "N/A";
  badge.className = "badge " + color;

  document.getElementById('servicesText').textContent = json.services?.join('\n') || 'Aucun service';

  // 🧠 Ajout d’une fonction robuste pour extraire les IP
  function extractIp(portStr) {
    const ipv6Match = portStr.match(/^\[([^\]]+)]/);
    if (ipv6Match) return ipv6Match[1].split('%')[0]; // IPv6 avec interface
    return portStr.split(':')[0]; // IPv4 ou générique
  }

  setTimeout(() => {
    const udpPortsDiv = document.getElementById("udpPorts");
    const tcpPortsDiv = document.getElementById("tcpPorts");
    const udpCountSpan = document.getElementById("udpCount");
    const tcpCountSpan = document.getElementById("tcpCount");

    if (!udpPortsDiv || !tcpPortsDiv || !json.ports) return;

    const udpPorts = json.ports.filter(p => p.proto.toLowerCase() === 'udp');
    const tcpPorts = json.ports.filter(p => p.proto.toLowerCase() === 'tcp');

    udpCountSpan.textContent = udpPorts.length;
    tcpCountSpan.textContent = tcpPorts.length;

    function groupAndDisplayPorts(ports, container, icon) {
      const grouped = {};
      ports.forEach(p => {
        const ip = extractIp(p.port);
        if (!grouped[ip]) grouped[ip] = [];
        grouped[ip].push(p.port);
      });

      container.innerHTML = "";

      Object.entries(grouped).forEach(([ip, portList]) => {
        const group = document.createElement("div");
        group.className = "port-group";

        const ipTitle = document.createElement("div");
        ipTitle.className = "port-ip";
        ipTitle.innerHTML = `
          <span>${ip}</span>
          <button class="copy-ip-btn" onclick="navigator.clipboard.writeText(\`${portList.join('\n')}\`)">📋</button>
        `;
        group.appendChild(ipTitle);

        portList.sort().forEach(port => {
          const entry = document.createElement("div");
          entry.className = "port-entry";
          entry.innerHTML = `<i class="${icon}"></i><span class="port-address">${port}</span>`;
          group.appendChild(entry);
        });

        container.appendChild(group);
      });
    }


    groupAndDisplayPorts(udpPorts, udpPortsDiv, "fas fa-broadcast-tower");
    groupAndDisplayPorts(tcpPorts, tcpPortsDiv, "fas fa-network-wired");
  }, 0);

  const topCpu = json.top_cpu?.slice(1).map(p => `${p.cmd} (PID ${p.pid}) - CPU ${p.cpu}%, RAM ${p.mem}%`) || [];
  document.getElementById('topCpuText').textContent = topCpu.length ? topCpu.join('\n') : 'Aucun processus';

  const topMem = json.top_mem?.slice(1).map(p => `${p.cmd} (PID ${p.pid}) - RAM ${p.mem}%, CPU ${p.cpu}%`) || [];
  document.getElementById('topMemText').textContent = topMem.length ? topMem.join('\n') : 'Aucun processus';

  const docker = json.docker?.join('\n') || 'Aucun conteneur';
  document.getElementById('dockerText').textContent = docker;
}

async function init() {
  try {
    showStatus('Chargement…', 'loading');
    const list = await fetchIndex();
    parseIndex(list);
    if (!latestEntry) {
      showStatus('Aucun rapport', 'empty');
      return;
    }
    selectedDate = latestEntry.date;
    document.getElementById('datePicker').value = selectedDate;
    updateDayButtons();
    const file = populateDay(selectedDate);
    if (file) await selectTime(file);
    document.getElementById('latestInfo').textContent = `${latestEntry.time} — ${formatRelative(latestEntry.iso)}`;
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports', 'error');
    return;
  }


  document.getElementById('btnLatest').addEventListener('click', async () => {
    if (!latestEntry) return;
    selectedDate = latestEntry.date;
    document.getElementById('datePicker').value = selectedDate;
    updateDayButtons();
    populateDay(selectedDate);
    await selectTime(latestEntry.file);
  });

  document.getElementById('dayToday').addEventListener('click', () => {
    const day = new Date().toISOString().slice(0,10);
    document.getElementById('datePicker').value = day;
    selectedDate = day;
    updateDayButtons();
    const file = populateDay(day);
    if (file) selectTime(file);
  });

  document.getElementById('dayYesterday').addEventListener('click', () => {
    const day = new Date(Date.now()-86400000).toISOString().slice(0,10);
    document.getElementById('datePicker').value = day;
    selectedDate = day;
    updateDayButtons();
    const file = populateDay(day);
    if (file) selectTime(file);
  });

  document.getElementById('dayCalendar').addEventListener('click', () => {
    const picker = document.getElementById('datePicker');
    picker.showPicker?.();
    picker.focus();
  });

  document.getElementById('datePicker').addEventListener('change', () => {
    selectedDate = document.getElementById('datePicker').value;
    updateDayButtons();
    const file = populateDay(selectedDate);
    if (file) selectTime(file);
  });


  setInterval(refreshAudits, 60000);
}

async function refreshAudits() {
  const dot = document.getElementById('refreshDot');
  dot.classList.add('active');
  const oldList = auditsMap[selectedDate] ? auditsMap[selectedDate].map(e => e.file) : [];
  const wasOnLatest = currentFile && latestEntry && currentFile === latestEntry.file;
  try {
    const list = await fetchIndex();
    parseIndex(list);
    if (latestEntry) {
      document.getElementById('latestInfo').textContent = `${latestEntry.time} — ${formatRelative(latestEntry.iso)}`;
    }
    const newList = auditsMap[selectedDate] ? auditsMap[selectedDate].map(e => e.file) : [];
    const added = newList.filter(f => !oldList.includes(f));
    if (added.length || newList.length !== oldList.length) {
      populateDay(selectedDate);
      if (currentFile && newList.includes(currentFile)) setActiveTime(currentFile);
      added.forEach(f => {
        const chip = document.querySelector(`.time-chip[data-file="${f}"]`);
        if (chip) chip.insertAdjacentHTML('beforeend', '<span class="badge">Nouveau</span>');
      });
      if (added.length) showUpdateBadge();
    }
    if (wasOnLatest && latestEntry && latestEntry.file !== currentFile) {
      selectedDate = latestEntry.date;
      document.getElementById('datePicker').value = selectedDate;
      updateDayButtons();
      populateDay(selectedDate);
      await selectTime(latestEntry.file);
    }
  } catch (err) {
    console.error('refresh error', err);
  } finally {
    dot.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', init);
