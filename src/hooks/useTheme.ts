import { useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types';
import { useLocalStorage } from './useLocalStorage';

function parseTheme(raw: string): ThemeMode | null {
  return raw === 'light' || raw === 'dark' ? raw : null;
}

function getDefaultTheme(): ThemeMode {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<ThemeMode>(
    'tankapp_theme',
    getDefaultTheme,
    parseTheme
  );

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#f1f5f9');
    }

    const metaStatusBar = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (metaStatusBar) {
      metaStatusBar.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  return { theme, toggleTheme };
}
