import { jest } from '@jest/globals';


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

