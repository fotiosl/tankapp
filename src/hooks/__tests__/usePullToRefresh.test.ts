import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from '../usePullToRefresh';

function createTouchEvent(type: string, clientY?: number): Event {
  const evt = new Event(type, { bubbles: true });
  Object.defineProperty(evt, 'touches', {
    value: clientY !== undefined ? [{ clientY }] : [],
  });
  return evt;
}

describe('usePullToRefresh', () => {
  it('keeps isRefreshing active until the async onRefresh promise resolves', async () => {
    let resolveRefresh: (() => void) | null = null;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, pullThreshold: 50 })
    );

    act(() => {
      window.dispatchEvent(createTouchEvent('touchstart', 0));
      window.dispatchEvent(createTouchEvent('touchmove', 200));
    });

    expect(result.current.isTriggered).toBe(true);

    act(() => {
      window.dispatchEvent(createTouchEvent('touchend'));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      resolveRefresh?.();
      await Promise.resolve();
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullDistance).toBe(0);
  });
});
