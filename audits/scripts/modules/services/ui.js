import ServiceStore from './data.js';

let servicesInit = false;
let servicesList;

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
    item.querySelector('.service-icon').textContent = s.icon;
    const nameEl = item.querySelector('.service-name');
    nameEl.textContent = s.name;
    const badge = item.querySelector('.service-badge');
    badge.textContent = s.category;
    badge.classList.add(
      'cat-' + s.category.toLowerCase().replace(/[\s/]+/g, '-')
    );
    frag.appendChild(item);
  });
  servicesList.appendChild(frag);
  servicesList.querySelectorAll('.service-name').forEach((el) => {
    const diff = el.scrollWidth - el.clientWidth;
    if (diff > 0) {
      el.classList.add('scrollable');
      el.style.setProperty('--scroll-distance', `-${diff}px`);
    }
  });
  countSpan.textContent = `${list.length} service${list.length > 1 ? 's' : ''}`;
}

export function initServicesUI() {
  if (servicesInit) return;
  servicesInit = true;
  const sortSelect = document.getElementById('serviceSort');
  servicesList = document.getElementById('servicesList');
  sortSelect.addEventListener('change', (e) => {
    ServiceStore.setSort(e.target.value);
    renderServicesList();
  });
}

