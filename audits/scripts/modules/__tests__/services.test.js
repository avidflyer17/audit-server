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

  it('filters by category', () => {
    ServiceStore.setData(['sshd', 'cron']);
    ServiceStore.toggleCategory('Sécurité');
    const filtered = ServiceStore.getFiltered().map((s) => s.name);
    expect(filtered).toEqual(['cron']);
    ServiceStore.toggleCategory('Sécurité');
    const again = ServiceStore.getFiltered().map((s) => s.name);
    expect(again).toContain('sshd');
  });
});
