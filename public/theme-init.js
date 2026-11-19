(function () {
  try {
    var saved = localStorage.getItem('tankapp_theme');
    var prefersLight =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    var isLight = saved === 'light' || (saved !== 'dark' && prefersLight);
    document.documentElement.classList.toggle('dark', !isLight);
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', isLight ? '#f1f5f9' : '#0f172a');
    var metaStatus = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (metaStatus) metaStatus.setAttribute('content', isLight ? 'default' : 'black-translucent');
  } catch {
    // Ignore storage / DOM access errors
  }
})();
