let cpuChartInstance = null;
let memoryChartInstance = null;

let auditsIndex = [];
let auditsMap = {};
let latestEntry = null;
let currentFile = null;

async function fetchIndex() {
  const res = await fetch('/archives/index.json');
  return await res.json();
}

async function loadAudit(file) {
  try {
    const res = await fetch('/archives/' + file);
    if (!res.ok) throw new Error("Fichier inaccessible");
    return await res.json();
  } catch (err) {
    console.error("Erreur chargement :", err);
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

function setDateToLatest() {
  if (latestEntry) {
    document.getElementById('datePicker').value = latestEntry.date;
  }
}

function formatRelative(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(navigator.language, { numeric: 'auto' });
  return rtf.format(-minutes, 'minute');
}

function populateTimesForDay(day) {
  const select = document.getElementById('timeSelect');
  select.innerHTML = '';
  const list = auditsMap[day] || [];
  if (list.length === 0) {
    showStatus('Aucun rapport pour ce jour', 'empty');
    return null;
  }
  showStatus('');
  list.forEach(item => {
    const option = document.createElement('option');
    const locale = item.iso.toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' });
    option.textContent = `${locale} — ${formatRelative(item.iso)}`;
    option.value = item.file;
    option.dataset.iso = item.iso.toISOString();
    select.appendChild(option);
  });
  const last = list[list.length - 1];
  select.value = last.file;
  return last.file;
}

function applyTimeFilter(query) {
  const q = query.toLowerCase();
  const select = document.getElementById('timeSelect');
  Array.from(select.options).forEach(opt => {
    opt.hidden = !opt.textContent.toLowerCase().includes(q);
  });
}

function showStatus(message, type) {
  const div = document.getElementById('selectorStatus');
  div.className = type || '';
  if (type === 'loading') {
    div.innerHTML = `<div class="skeleton"></div> ${message}`;
  } else if (type === 'error') {
    div.innerHTML = `${message} <button id="retryBtn" class="btn">Réessayer</button>`;
    document.getElementById('retryBtn').addEventListener('click', init);
  } else {
    div.textContent = message || '';
  }
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
    setDateToLatest();
    const file = populateTimesForDay(document.getElementById('datePicker').value);
    if (file) {
      const json = await loadAudit(file);
      if (json) {
        currentFile = file;
        renderCpuChart(json.cpu.usage);
        renderText(json);
      }
    }
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Erreur de chargement — Réessayer', 'error');
    return;
  }

  const datePicker = document.getElementById('datePicker');
  const timeFilter = document.getElementById('timeFilter');
  const timeSelect = document.getElementById('timeSelect');
  const btnLatest = document.getElementById('btnLatest');

  datePicker.addEventListener('change', async function () {
    const file = populateTimesForDay(this.value);
    timeFilter.value = '';
    applyTimeFilter('');
    if (file) {
      const json = await loadAudit(timeSelect.value);
      if (json) {
        currentFile = timeSelect.value;
        renderCpuChart(json.cpu.usage);
        renderText(json);
      }
    }
  });

  timeFilter.addEventListener('input', e => applyTimeFilter(e.target.value));

  timeSelect.addEventListener('change', async function () {
    const json = await loadAudit(this.value);
    if (json) {
      currentFile = this.value;
      renderCpuChart(json.cpu.usage);
      renderText(json);
    }
  });

  timeSelect.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
      const json = await loadAudit(this.value);
      if (json) {
        currentFile = this.value;
        renderCpuChart(json.cpu.usage);
        renderText(json);
      }
    }
  });

  btnLatest.addEventListener('click', async () => {
    if (!latestEntry) return;
    document.getElementById('datePicker').value = latestEntry.date;
    populateTimesForDay(latestEntry.date);
    timeFilter.value = '';
    applyTimeFilter('');
    document.getElementById('timeSelect').value = latestEntry.file;
    const json = await loadAudit(latestEntry.file);
    if (json) {
      currentFile = latestEntry.file;
      renderCpuChart(json.cpu.usage);
      renderText(json);
    }
  });

  setInterval(refreshAudits, 60000);
}

async function refreshAudits() {
  const dot = document.getElementById('refreshDot');
  dot.classList.add('active');
  const selectedDate = document.getElementById('datePicker').value;
  const previousCount = (auditsMap[selectedDate] || []).length;
  const wasOnLatest = currentFile && latestEntry && currentFile === latestEntry.file;
  try {
    const list = await fetchIndex();
    parseIndex(list);
    const newCount = (auditsMap[selectedDate] || []).length;
    if (newCount > previousCount) {
      const previousFile = document.getElementById('timeSelect').value;
      populateTimesForDay(selectedDate);
      const select = document.getElementById('timeSelect');
      if (Array.from(select.options).some(o => o.value === previousFile)) {
        select.value = previousFile;
      }
    }
    if (wasOnLatest && latestEntry && latestEntry.file !== currentFile) {
      document.getElementById('datePicker').value = latestEntry.date;
      populateTimesForDay(latestEntry.date);
      document.getElementById('timeSelect').value = latestEntry.file;
      const json = await loadAudit(latestEntry.file);
      if (json) {
        currentFile = latestEntry.file;
        renderCpuChart(json.cpu.usage);
        renderText(json);
      }
    }
  } catch (err) {
    console.error('refresh error', err);
  } finally {
    dot.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', init);
