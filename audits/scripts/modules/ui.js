export const ICON_MAP = [
  { regex: /docker|containerd/i, icon: '🐳' },
  { regex: /nginx|traefik|caddy/i, icon: '🌐' },
  { regex: /node|nodejs/i, icon: '🟩' },
  { regex: /python|gunicorn|uvicorn/i, icon: '🐍' },
  { regex: /java/i, icon: '☕' },
  { regex: /redis/i, icon: '⚡' },
  { regex: /postgres|postgre/i, icon: '🐘' },
  { regex: /mysql|mariadb/i, icon: '🛢️' },
  { regex: /mongodb/i, icon: '🍃' },
  { regex: /jellyfin|plex|emby/i, icon: '🎬' },
  { regex: /adguard/i, icon: '🛡️' },
  { regex: /crowdsec/i, icon: '🧱' },
  { regex: /zigbee2mqtt|mqtt|mosquitto/i, icon: '📶' },
  { regex: /ssh|openssh/i, icon: '🔐' },
  { regex: /smb|samba/i, icon: '🗂️' },
  { regex: /prometheus|exporter|grafana/i, icon: '📈' },
  { regex: /.*/, icon: '⚙️' },
];

export function iconFor(name) {
  for (const m of ICON_MAP) {
    if (m.regex.test(name)) return m.icon;
  }
  return '⚙️';
}

export function colorClassCpu(v) {
  const val = Number(v);
  if (val < 40) return 'color-success';
  if (val < 70) return 'color-warning';
  return 'color-danger';
}

export function colorClassRam(v) {
  const val = Number(v);
  if (val < 40) return 'color-info';
  if (val < 70) return 'color-warning';
  return 'color-danger';
}

export function setupCopy(id, getter) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.onclick = () => {
    const text = getter();
    if (!text || text === '--' || text === 'N/A') return;
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      setTimeout(() => {
        btn.innerHTML = original;
      }, 1000);
    });
  };
}

export function contrastColor(bg) {
  const rgb = bg.match(/\d+/g).map(Number);
  const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return luminance > 140 ? '#000' : '#fff';
}

export function adjustBarValue(valueEl, fillEl, val) {
  let bg;
  if (val >= 20) {
    bg = getComputedStyle(fillEl).backgroundColor;
  } else {
    bg = getComputedStyle(fillEl.parentElement).backgroundColor;
  }
  valueEl.style.color = contrastColor(bg);
}

export function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('menuToggle');
  const overlay = document.getElementById('menuOverlay');
  if (!sidebar || !toggle || !overlay) return;
  const close = () => sidebar.classList.remove('open');
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  overlay.addEventListener('click', close);
}
