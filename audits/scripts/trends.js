async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Échec du chargement de ${url}`);
  return res.json();
}

function labelFromFile(fn) {
  const m = fn.match(/audit_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/);
  return m ? `${m[1]} ${m[2].replace('-', ':')}` : fn;
}

function parseSizeToBytes(val) {
  if (val == null) return 0;
  const m = String(val).trim().replace(/,/g, '.').match(/^(\d+(?:\.\d+)?)(?:\s*(B|[KMGT](?:iB?|i|B)?))?$/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const unit = (m[2] || 'B').toUpperCase();
  const map = {
    B: 1,
    K: 1024, KB: 1024, KI: 1024, KIB: 1024,
    M: 1024 ** 2, MB: 1024 ** 2, MI: 1024 ** 2, MIB: 1024 ** 2,
    G: 1024 ** 3, GB: 1024 ** 3, GI: 1024 ** 3, GIB: 1024 ** 3,
    T: 1024 ** 4, TB: 1024 ** 4, TI: 1024 ** 4, TIB: 1024 ** 4,
  };
  return num * (map[unit] || 1);
}

function setupMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('menuOverlay');
  const toggle = document.getElementById('menuToggle');
  if (!sidebar || !overlay || !toggle) return;
  const icon = toggle.querySelector('i');
  const closeMenu = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    toggle.classList.remove('open');
    icon.classList.remove('fa-xmark');
    icon.classList.add('fa-bars');
  };
  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    toggle.classList.toggle('open', isOpen);
    icon.classList.toggle('fa-bars', !isOpen);
    icon.classList.toggle('fa-xmark', isOpen);
  });
  overlay.addEventListener('click', closeMenu);
}

async function loadTrends() {
  const index = await fetchJSON('archives/index.json');
  index.sort();
  const labels = [];
  const load1 = [], load5 = [], load15 = [], mem = [], disk = [];

  for (const file of index) {
    const data = await fetchJSON(`archives/${file}`);
    labels.push(labelFromFile(file));

    if (data.load_average) {
      const parts = String(data.load_average).split(',').map(v => parseFloat(v));
      load1.push(parts[0] || 0);
      load5.push(parts[1] || 0);
      load15.push(parts[2] || 0);
    } else {
      load1.push(0); load5.push(0); load15.push(0);
    }

    if (data.memory && data.memory.ram) {
      const used = parseSizeToBytes(data.memory.ram.used);
      const total = parseSizeToBytes(data.memory.ram.total);
      mem.push(total ? (used / total) * 100 : 0);
    } else {
      mem.push(0);
    }

    if (Array.isArray(data.disks) && data.disks.length) {
      let tot = 0, used = 0;
      for (const d of data.disks) {
        tot += parseSizeToBytes(d.size);
        used += parseSizeToBytes(d.used);
      }
      disk.push(tot ? (used / tot) * 100 : 0);
    } else {
      disk.push(0);
    }
  }

  new Chart(document.getElementById('loadChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '1 min', data: load1, borderColor: 'var(--accent)', fill: false },
        { label: '5 min', data: load5, borderColor: 'var(--primary)', fill: false },
        { label: '15 min', data: load15, borderColor: 'var(--warn)', fill: false },
      ],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });

  new Chart(document.getElementById('memChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'RAM % utilisée', data: mem, borderColor: 'var(--primary)', fill: false },
      ],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
  });

  new Chart(document.getElementById('diskChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Disque % utilisé', data: disk, borderColor: 'var(--crit)', fill: false },
      ],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupMenu();
  loadTrends().catch(err => console.error(err));
});

