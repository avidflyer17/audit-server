import { describe, it, expect, beforeEach } from 'vitest';
import ServiceStore from '../services/data.js';

describe('ServiceStore', () => {
  beforeEach(() => {
    ServiceStore.resetFilters();
    ServiceStore.setData([]);
  });

  it('classifies services', () => {
    const result = ServiceStore.setData(['sshd', 'unknown']);
    const ssh = result.find((s) => s.name === 'sshd');
    const other = result.find((s) => s.name === 'unknown');
    expect(ssh.category).toBe('Sécurité');
    expect(other.category).toBe('Autre');
  });

  it('sorts services', () => {
    ServiceStore.setData(['b.service', 'a.service']);
    ServiceStore.setSort('az');
    const az = ServiceStore.getFiltered().map((s) => s.name);
    expect(az).toEqual(['a.service', 'b.service']);
    ServiceStore.setSort('za');
    const za = ServiceStore.getFiltered().map((s) => s.name);
    expect(za).toEqual(['b.service', 'a.service']);
  });
});
