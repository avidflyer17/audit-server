import { init } from './modules/audits.js';
import { initTheme } from './modules/theme.js';

document.addEventListener('DOMContentLoaded', () => {
  init();
  initTheme();
});
