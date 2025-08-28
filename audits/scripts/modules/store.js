export function createListStore({
  data = [],
  filtered = [],
  search = '',
  sort = '',
  filters = new Set(),
  filterFunc = () => true,
  sortFunc = () => {},
  resetFunc = null,
} = {}) {
  return {
    data,
    filtered,
    search,
    sort,
    filters,
    setData(arr) {
      this.data = arr || [];
      return this.applyFilters();
    },
    setSearch(value) {
      this.search = value.toLowerCase();
      return this.applyFilters();
    },
    setSort(value) {
      this.sort = value;
      return this.applyFilters();
    },
    toggleFilter(val) {
      if (this.filters.has(val)) this.filters.delete(val);
      else this.filters.add(val);
      return this.applyFilters();
    },
    applyFilters() {
      this.filtered = this.data.filter((item) => filterFunc.call(this, item));
      sortFunc.call(this, this.filtered);
      return this.filtered;
    },
    resetFilters() {
      if (typeof resetFunc === 'function') resetFunc.call(this);
      return this.applyFilters();
    },
    getFiltered() {
      return this.filtered;
    },
  };
}
