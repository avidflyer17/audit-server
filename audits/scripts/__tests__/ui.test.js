import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
const bodyHtml = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];

describe('services UI', () => {
  let ServiceStore;
  let initServicesUI;
  let renderServicesList;
  let SERVICE_CATEGORIES;

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = bodyHtml;
    const dataModule = await import('../modules/services/data.js');
    ServiceStore = dataModule.default;
    SERVICE_CATEGORIES = dataModule.SERVICE_CATEGORIES;
    const uiModule = await import('../modules/services/ui.js');
    initServicesUI = uiModule.initServicesUI;
    renderServicesList = uiModule.renderServicesList;
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    global.alert = jest.fn();
  });

  test('initServicesUI creates chips and handles clicks', () => {
    ServiceStore.setData(['sshd', 'cron']);
    initServicesUI();
    renderServicesList();
    const chips = document.querySelectorAll('#categoryFilters .filter-chip');
    expect(chips.length).toBe(SERVICE_CATEGORIES.length);
    const itemsBefore = document.querySelectorAll('#servicesList .service-item');
    expect(itemsBefore.length).toBe(2);
    const secChip = Array.from(chips).find((c) => c.textContent === 'Sécurité');
    fireEvent.click(secChip);
    expect(secChip.classList.contains('active')).toBe(false);
    const itemsAfter = document.querySelectorAll('#servicesList .service-item');
    expect(itemsAfter.length).toBe(1);
  });

  test('renderServicesList shows full list', () => {
    ServiceStore.setData(['sshd', 'cron']);
    initServicesUI();
    renderServicesList();
    const items = document.querySelectorAll('#servicesList .service-item');
    expect(items.length).toBe(2);
    expect(document.getElementById('servicesCount').textContent).toBe('2 services');
  });
});

describe('showStatus', () => {
  let showStatus;
  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = '<div id="selectorStatus" aria-live="polite"></div>';
    ({ showStatus } = await import('../modules/audits.js'));
  });

  test('updates text and class', () => {
    const div = document.getElementById('selectorStatus');
    showStatus('Loading', 'loading');
    expect(div.textContent).toBe('Loading');
    expect(div.className).toBe('loading');
    expect(div.getAttribute('aria-live')).toBe('polite');
  });
});

describe('setupCopy', () => {
  let setupCopy;
  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = '<button id="copyBtn">copy</button>';
    ({ setupCopy } = await import('../modules/ui.js'));
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('copies text and restores label', async () => {
    setupCopy('copyBtn', () => 'hello');
    const btn = document.getElementById('copyBtn');
    btn.click();
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    expect(btn.innerHTML).toBe('<i class="fa-solid fa-check"></i>');
    jest.runAllTimers();
    expect(btn.textContent).toBe('copy');
  });

  test('ignores invalid text', () => {
    setupCopy('copyBtn', () => '--');
    const btn = document.getElementById('copyBtn');
    btn.click();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(btn.textContent).toBe('copy');
  });
});

describe('toggleServiceItem', () => {
  let toggleServiceItem;
  beforeEach(async () => {
    jest.resetModules();
    ({ toggleServiceItem } = await import('../modules/services/ui.js'));
  });

  test('toggles aria-expanded and class', () => {
    const item = document.createElement('div');
    item.className = 'service-item';
    item.setAttribute('aria-expanded', 'false');
    toggleServiceItem(item);
    expect(item.classList.contains('expanded')).toBe(true);
    expect(item.getAttribute('aria-expanded')).toBe('true');
    toggleServiceItem(item);
    expect(item.classList.contains('expanded')).toBe(false);
    expect(item.getAttribute('aria-expanded')).toBe('false');
  });
});
