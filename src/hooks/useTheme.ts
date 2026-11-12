import { useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types';
import { useLocalStorage } from './useLocalStorage';

function parseTheme(raw: string): ThemeMode | null {
  return raw === 'light' || raw === 'dark' ? raw : null;
}

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<ThemeMode>('tankapp_theme', 'dark', parseTheme);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#f1f5f9');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  return { theme, toggleTheme };
}
