import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';
import { isRecord, parseJsonSafe } from '../../utils/typeGuards';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to default value when stored JSON fails parser validation', () => {
    localStorage.setItem('test_obj', 'null');

    const parseObj = (raw: string): { count: number } | null => {
      const parsed = parseJsonSafe(raw);
      if (!isRecord(parsed)) return null;
      return typeof parsed.count === 'number' ? { count: parsed.count } : null;
    };

    const { result } = renderHook(() =>
      useLocalStorage('test_obj', { count: 42 }, parseObj)
    );
    expect(result.current[0]).toEqual({ count: 42 });
  });

  it('persists updates accurately across consecutive functional updates', () => {
    const parseCount = (raw: string): number | null => {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const { result } = renderHook(() => useLocalStorage('test_counter', 0, parseCount));

    act(() => {
      result.current[1]((prev) => prev + 1);
      result.current[1]((prev) => prev + 2);
    });

    expect(result.current[0]).toBe(3);
    expect(localStorage.getItem('test_counter')).toBe('3');
  });
});
