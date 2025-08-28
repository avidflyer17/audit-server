import { createListStore } from '../store.js';
import { SERVICE_PATTERNS } from './config.js';
export { SERVICE_PATTERNS };

function getServiceMeta(name) {
  for (const p of SERVICE_PATTERNS) {
    if (p.regex.test(name)) return p;
  }
  return { icon: '⬜', category: 'Autre' };
}

const ServiceStore = createListStore({
  sort: 'az',
  filterFunc() {
    return true;
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
    this.sort = 'az';
  },
});

ServiceStore.setData = function (names) {
  this.data = (names || []).map((n) => {
    const meta = getServiceMeta(n);
    return {
      name: n,
      icon: meta.icon,
      category: meta.category,
    };
  });
  return this.applyFilters();
};

export default ServiceStore;
