import { describe, it, expect } from 'vitest';
import { parseIndex, auditsMap, latestEntry } from '../audits.js';

describe('parseIndex', () => {
  it('orders entries chronologically and identifies latest', () => {
    parseIndex([
      'audit_2024-01-01_10-00.json',
      'audit_2024-01-01_09-00.json',
      'audit_2024-01-02_08-00.json',
    ]);
    const times = auditsMap['2024-01-01'].map((e) => e.time);
    expect(times).toEqual(['09:00', '10:00']);
    expect(latestEntry.file).toBe('audit_2024-01-02_08-00.json');
  });

  it('ignores invalid filenames', () => {
    parseIndex(['invalid.json', 'audit_2024-01-01_10-00.json']);
    expect(auditsMap['2024-01-01']).toHaveLength(1);
    expect(latestEntry.file).toBe('audit_2024-01-01_10-00.json');
  });
});
