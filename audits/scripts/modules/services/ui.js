import ServiceStore, { SERVICE_CATEGORIES } from './data.js';

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
  const tpl = document.getElementById('tpl-service-item');
  list.forEach((s) => {
    const item = tpl.content.firstElementChild.cloneNode(true);
    item.title = s.desc;
    item.querySelector('.service-icon').textContent = s.icon;
    item.querySelector('.service-name').textContent = s.name;
    const badge = item.querySelector('.service-badge');
    badge.textContent = s.category;
    badge.classList.add(
      'cat-' + s.category.toLowerCase().replace(/[\s/]+/g, '-')
    );
    item.querySelector('.service-unit').textContent = s.name;
    const copyBtn = item.querySelector('.copy-btn');
    copyBtn.dataset.name = s.name;
    item.querySelector('.service-desc').textContent = s.desc;
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
    ServiceStore.setSearch(e.target.value);
    renderServicesList();
  });
  sortSelect.addEventListener('change', (e) => {
    ServiceStore.setSort(e.target.value);
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

