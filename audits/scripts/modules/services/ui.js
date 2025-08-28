import { SERVICE_CATEGORIES, ServiceStore } from './data.js';

let servicesInit = false;
let servicesList;

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

export function renderServicesList() {
  const list = ServiceStore.getFiltered();
  servicesList.textContent = '';
  const countSpan = document.getElementById('servicesCount');
  if (list.length === 0) {
    countSpan.textContent = '0 service';
    document.getElementById('servicesEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('servicesEmpty').classList.add('hidden');
  const frag = document.createDocumentFragment();
  list.forEach((s) => {
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
  countSpan.textContent = `${list.length} service${list.length > 1 ? 's' : ''}`;
}

export function initServicesUI() {
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
      ServiceStore.toggleCategory(cat);
      chip.classList.toggle('active');
      renderServicesList();
    });
    filtersDiv.appendChild(chip);
  });
  searchInput.addEventListener('input', (e) => {
    ServiceStore.updateSearch(e.target.value);
    renderServicesList();
  });
  sortSelect.addEventListener('change', (e) => {
    ServiceStore.updateSort(e.target.value);
    renderServicesList();
  });
  document.getElementById('resetFilters').addEventListener('click', () => {
    ServiceStore.resetFilters();
    searchInput.value = '';
    sortSelect.value = 'az';
    document
      .querySelectorAll('#categoryFilters .filter-chip')
      .forEach((c) => c.classList.add('active'));
    renderServicesList();
  });

  servicesList.addEventListener('click', handleServicesListClick);
  servicesList.addEventListener('keydown', handleServicesListKeydown);
}
