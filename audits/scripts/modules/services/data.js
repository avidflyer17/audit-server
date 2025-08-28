export const SERVICE_CATEGORIES = [
  'Système',
  'Réseau',
  'Stockage/Partages',
  'Conteneurs',
  'Sécurité',
  'Journalisation',
  'Mises à jour',
  'Autre',
];

export const SERVICE_PATTERNS = [
  { regex: /docker|containerd/i, icon: '🐳', category: 'Conteneurs' },
  { regex: /ssh/i, icon: '🔐', category: 'Sécurité' },
  { regex: /cron/i, icon: '⏱️', category: 'Système' },
  { regex: /dbus/i, icon: '🔌', category: 'Système' },
  { regex: /ntp|ntpsec|timesync/i, icon: '🕒', category: 'Réseau' },
  { regex: /rpcbind/i, icon: '🧭', category: 'Réseau' },
  { regex: /rpc|nfs/i, icon: '📡', category: 'Réseau' },
  { regex: /smb|smbd|nmbd|cifs/i, icon: '🗂️', category: 'Stockage/Partages' },
  {
    regex: /systemd-(journald|logind|networkd|resolved|udevd)/i,
    icon: '⚙️',
    category: 'Système',
  },
  { regex: /rsyslog/i, icon: '📝', category: 'Journalisation' },
  { regex: /bluetooth/i, icon: '📶', category: 'Réseau' },
  { regex: /unattended-upgrades/i, icon: '🔄', category: 'Mises à jour' },
  { regex: /thermald/i, icon: '🌡️', category: 'Système' },
];

export let servicesData = [];
export let filteredServices = [];
export let activeServiceCats = new Set(SERVICE_CATEGORIES);
export let serviceSearch = '';
export let serviceSort = 'az';

export function getServiceMeta(name) {
  for (const p of SERVICE_PATTERNS) {
    if (p.regex.test(name)) return p;
  }
  return { icon: '⬜', category: 'Autre' };
}

export function setServicesData(names) {
  servicesData = (names || []).map((n) => {
    const meta = getServiceMeta(n);
    return {
      name: n,
      icon: meta.icon,
      category: meta.category,
      desc: 'Service systemd',
    };
  });
  return applyServiceFilters();
}

export function applyServiceFilters() {
  filteredServices = servicesData.filter(
    (s) =>
      activeServiceCats.has(s.category) &&
      s.name.toLowerCase().includes(serviceSearch),
  );
  if (serviceSort === 'az')
    filteredServices.sort((a, b) => a.name.localeCompare(b.name));
  else if (serviceSort === 'za')
    filteredServices.sort((a, b) => b.name.localeCompare(a.name));
  else if (serviceSort === 'cat')
    filteredServices.sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );
  return filteredServices;
}

export function updateSearch(value) {
  serviceSearch = value.toLowerCase();
  return applyServiceFilters();
}

export function updateSort(value) {
  serviceSort = value;
  return applyServiceFilters();
}

export function toggleCategory(cat) {
  if (activeServiceCats.has(cat)) activeServiceCats.delete(cat);
  else activeServiceCats.add(cat);
  return applyServiceFilters();
}

export function resetFilters() {
  serviceSearch = '';
  serviceSort = 'az';
  activeServiceCats = new Set(SERVICE_CATEGORIES);
  return applyServiceFilters();
}
