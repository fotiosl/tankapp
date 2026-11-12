import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  parse?: (raw: string) => T | null
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      if (parse) {
        const parsed = parse(raw);
        return parsed !== null ? parsed : defaultValue;
      }
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          const serialized = typeof next === 'string' && parse ? next : JSON.stringify(next);
          localStorage.setItem(key, serialized);
        } catch {
          // Ignore storage quota / private mode errors
        }
        return next;
      });
    },
    [key, parse]
  );

  return [storedValue, setValue];
}
