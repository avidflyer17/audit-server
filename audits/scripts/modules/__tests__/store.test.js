import { describe, it, expect, beforeEach } from 'vitest';
import { createListStore } from '../store.js';

describe('createListStore', () => {
  let store;
  const data = [
    { id: 1, name: 'alpha' },
    { id: 2, name: 'beta' },
    { id: 3, name: 'gamma' },
  ];

  beforeEach(() => {
    store = createListStore({
      filterFunc(item) {
        return item.name.toLowerCase().includes(this.search);
      },
      sortFunc(list) {
        if (this.sort === 'desc') list.sort((a, b) => b.id - a.id);
        else list.sort((a, b) => a.id - b.id);
      },
      resetFunc() {
        this.search = '';
        this.sort = 'asc';
      },
    });
    store.setData(data);
  });

  it('searches items', () => {
    const result = store.setSearch('ga').map((i) => i.name);
    expect(result).toEqual(['gamma']);
  });

  it('sorts items', () => {
    store.setSort('desc');
    const ids = store.getFiltered().map((i) => i.id);
    expect(ids).toEqual([3, 2, 1]);
  });

  it('resets filters', () => {
    store.setSearch('beta');
    store.setSort('desc');
    store.resetFilters();
    expect(store.search).toBe('');
    expect(store.sort).toBe('asc');
    expect(store.getFiltered()).toHaveLength(3);
  });
});
