export function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    themeToggle.checked = theme === 'light';
    if (themeIcon)
      themeIcon.className = theme === 'light' ? 'fas fa-sun theme-icon' : 'fas fa-moon theme-icon';
  }

  const current = localStorage.getItem('theme') || 'dark';
  applyTheme(current);

  themeToggle.addEventListener('change', () => {
    const next = themeToggle.checked ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}

