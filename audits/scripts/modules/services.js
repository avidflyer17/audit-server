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

let servicesData = [];
let filteredServices = [];
let activeServiceCats = new Set(SERVICE_CATEGORIES);
let serviceSearch = '';
let serviceSort = 'az';
let servicesInit = false;
let servicesList;

function getServiceMeta(name) {
  for (const p of SERVICE_PATTERNS) {
    if (p.regex.test(name)) return p;
  }
  return { icon: '⬜', category: 'Autre' };
}

function initServicesUI() {
  if (servicesInit) return;
  servicesInit = true;
  const searchInput = document.getElementById('serviceSearch');
  const sortSelect = document.getElementById('serviceSort');
  const filtersDiv = document.getElementById('categoryFilters');
  servicesList = document.getElementById('servicesList');
  SERVICE_CATEGORIES.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip active';
    chip.textContent = cat;
    chip.dataset.cat = cat;
    chip.addEventListener('click', () => {
      if (activeServiceCats.has(cat)) activeServiceCats.delete(cat);
      else activeServiceCats.add(cat);
      chip.classList.toggle('active');
      applyServiceFilters();
    });
    filtersDiv.appendChild(chip);
  });
  searchInput.addEventListener('input', (e) => {
    serviceSearch = e.target.value.toLowerCase();
    applyServiceFilters();
  });
  sortSelect.addEventListener('change', (e) => {
    serviceSort = e.target.value;
    applyServiceFilters();
  });
  document.getElementById('resetFilters').addEventListener('click', () => {
    serviceSearch = '';
    serviceSort = 'az';
    activeServiceCats = new Set(SERVICE_CATEGORIES);
    searchInput.value = '';
    sortSelect.value = 'az';
    document
      .querySelectorAll('#categoryFilters .filter-chip')
      .forEach((c) => c.classList.add('active'));
    applyServiceFilters();
  });

  servicesList.addEventListener('click', handleServicesListClick);
  servicesList.addEventListener('keydown', handleServicesListKeydown);
}

function applyServiceFilters() {
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
  renderServicesList();
}

function toggleServiceItem(item) {
  const expanded = item.classList.toggle('expanded');
  item.setAttribute('aria-expanded', expanded);
}

function handleServicesListClick(e) {
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    e.stopPropagation();
    navigator.clipboard
      .writeText(copyBtn.dataset.name)
      .then(() => alert('Copié dans le presse-papiers !'));
    return;
  }
  const item = e.target.closest('.service-item');
  if (item) toggleServiceItem(item);
}

function handleServicesListKeydown(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (e.target.closest('.copy-btn')) return;
  const item = e.target.closest('.service-item');
  if (item) {
    e.preventDefault();
    toggleServiceItem(item);
  }
}

function renderServicesList() {
  servicesList.textContent = '';
  const countSpan = document.getElementById('servicesCount');
  if (filteredServices.length === 0) {
    countSpan.textContent = '0 service';
    document.getElementById('servicesEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('servicesEmpty').classList.add('hidden');
  const frag = document.createDocumentFragment();
  filteredServices.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'service-item';
    item.tabIndex = 0;
    item.title = s.desc;
    item.setAttribute('aria-expanded', 'false');

    const main = document.createElement('div');
    main.className = 'service-main';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'service-icon';
    iconSpan.textContent = s.icon;
    main.appendChild(iconSpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'service-name';
    nameSpan.textContent = s.name;
    main.appendChild(nameSpan);

    const badgeSpan = document.createElement('span');
    badgeSpan.className =
      'service-badge cat-' + s.category.toLowerCase().replace(/[\s/]+/g, '-');
    badgeSpan.textContent = s.category;
    main.appendChild(badgeSpan);

    item.appendChild(main);

    const details = document.createElement('div');
    details.className = 'service-details';

    const nameDiv = document.createElement('div');
    const strongName = document.createElement('strong');
    strongName.textContent = 'Nom de l’unité :';
    const code = document.createElement('code');
    code.textContent = s.name;
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn small';
    copyBtn.title = 'Copier le nom';
    copyBtn.textContent = '📋';
    copyBtn.dataset.name = s.name;
    nameDiv.append(strongName, ' ', code, ' ', copyBtn);
    details.appendChild(nameDiv);

    const typeDiv = document.createElement('div');
    const strongType = document.createElement('strong');
    strongType.textContent = 'Type :';
    typeDiv.append(strongType, ' service');
    details.appendChild(typeDiv);

    const descDiv = document.createElement('div');
    const strongDesc = document.createElement('strong');
    strongDesc.textContent = 'Description :';
    descDiv.append(strongDesc, ' ', s.desc);
    details.appendChild(descDiv);

    item.appendChild(details);

    frag.appendChild(item);
  });
  servicesList.appendChild(frag);
  countSpan.textContent = `${filteredServices.length} service${filteredServices.length > 1 ? 's' : ''}`;
}

export function renderServices(names) {
  initServicesUI();
  servicesData = (names || []).map((n) => {
    const meta = getServiceMeta(n);
    return {
      name: n,
      icon: meta.icon,
      category: meta.category,
      desc: 'Service systemd',
    };
  });
  applyServiceFilters();
}
