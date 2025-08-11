let cpuChartInstance = null;
let memoryChartInstance = null;

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

function renderText(json) {
  document.getElementById('generated').textContent = json.generated;
  document.getElementById('hostname').textContent = json.hostname;
  document.getElementById('ipInfo').textContent = `${json.ip_local || 'N/A'} / ${json.ip_pub || 'N/A'}`;

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
        if (value < 50) fill.classList.add("green");
        else if (value < 70) fill.classList.add("orange");
        else fill.classList.add("red");
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
  const list = await fetchIndex();
  const selector = document.getElementById('auditSelector');

  list.forEach(file => {
    const option = document.createElement('option');
    option.value = file;
    option.textContent = decodeURIComponent(file.replace('audit_', '').replace('.json', '').replace('_', ' à '));
    selector.appendChild(option);
  });

  selector.addEventListener('change', async (e) => {
    const json = await loadAudit(e.target.value);
    if (!json) return;
    renderCpuChart(json.cpu.usage);
    renderText(json);
  });

  if (list.length > 0) {
    selector.value = list[0];
    const initial = await loadAudit(list[0]);
    renderCpuChart(initial.cpu.usage);
    renderText(initial);
  }
}

init();
