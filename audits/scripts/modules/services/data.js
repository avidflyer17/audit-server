import { createListStore } from '../store.js';

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

function getServiceMeta(name) {
  for (const p of SERVICE_PATTERNS) {
    if (p.regex.test(name)) return p;
  }
  return { icon: '⬜', category: 'Autre' };
}

const ServiceStore = createListStore({
  sort: 'az',
  search: '',
  filterFunc(service) {
    return (
      this.activeCats.has(service.category) &&
      service.name.toLowerCase().includes(this.search)
    );
  },
  sortFunc(list) {
    if (this.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (this.sort === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
    else if (this.sort === 'cat')
      list.sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      );
  },
  resetFunc() {
    this.search = '';
    this.sort = 'az';
    this.activeCats = new Set(SERVICE_CATEGORIES);
  },
});

ServiceStore.activeCats = new Set(SERVICE_CATEGORIES);

ServiceStore.setData = function (names) {
  this.data = (names || []).map((n) => {
    const meta = getServiceMeta(n);
    return {
      name: n,
      icon: meta.icon,
      category: meta.category,
      desc: 'Service systemd',
    };
  });
  return this.applyFilters();
};

ServiceStore.toggleCategory = function (cat) {
  if (this.activeCats.has(cat)) this.activeCats.delete(cat);
  else this.activeCats.add(cat);
  return this.applyFilters();
};

export default ServiceStore;
