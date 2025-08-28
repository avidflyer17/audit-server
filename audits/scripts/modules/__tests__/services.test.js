import { describe, it, expect, beforeEach } from 'vitest';
import { renderServices } from '../services.js';

describe('renderServices', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="servicesGrid"></div><div id="servicesEmpty" class="hidden"></div><span id="servicesCount"></span>';
  });

  it('renders sorted services', () => {
    renderServices([{ id: 'b.service' }, { id: 'a.service' }]);
    const names = Array.from(document.querySelectorAll('.docker-name')).map((el) => el.textContent);
    expect(names).toEqual(['a.service', 'b.service']);
    expect(document.getElementById('servicesCount').textContent).toBe('2 services');
  });

  it('handles missing fields', () => {
    renderServices([{}]);
    const card = document.querySelector('.docker-card');
    expect(card.querySelector('.docker-name').textContent).toBe('—');
  });
});
