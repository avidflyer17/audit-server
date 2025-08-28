import { createListStore } from '../store.js';
import { SERVICE_CATEGORIES, SERVICE_PATTERNS } from './config.js';
export { SERVICE_CATEGORIES, SERVICE_PATTERNS };

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
