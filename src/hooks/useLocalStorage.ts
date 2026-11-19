import { useState, useCallback, useRef, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T | (() => T),
  parse: (raw: string) => T | null
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const resolveDefault = (): T =>
      defaultValue instanceof Function ? defaultValue() : defaultValue;

    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return resolveDefault();
      const parsed = parse(raw);
      return parsed !== null ? parsed : resolveDefault();
    } catch {
      return resolveDefault();
    }
  });

  const valueRef = useRef<T>(storedValue);

  useEffect(() => {
    valueRef.current = storedValue;
  }, [storedValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const next = value instanceof Function ? value(valueRef.current) : value;
      valueRef.current = next;
      setStoredValue(next);
      try {
        const serialized = typeof next === 'string' ? next : JSON.stringify(next);
        localStorage.setItem(key, serialized);
      } catch {
        // Ignore storage quota / private mode errors
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
