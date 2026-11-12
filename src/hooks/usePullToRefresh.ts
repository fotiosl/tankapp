import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullThreshold?: number;
  disabled?: boolean;
}

function shouldIgnorePullTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-no-pull-refresh="true"], [role="dialog"]')) {
    return true;
  }

  let el: Element | null = target;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function usePullToRefresh({
  onRefresh,
  pullThreshold = 70,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);

  const updatePullDistance = useCallback((distance: number) => {
    pullDistanceRef.current = distance;
    setPullDistance(distance);
  }, []);

  const resetPull = useCallback(() => {
    isPullingRef.current = false;
    startYRef.current = null;
    updatePullDistance(0);
  }, [updatePullDistance]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshingRef.current) return;
      if (e.touches.length !== 1) {
        resetPull();
        return;
      }
      if (shouldIgnorePullTarget(e.target)) return;

      const touch = e.touches[0];
      if (touch && window.scrollY <= 2) {
        startYRef.current = touch.clientY;
        isPullingRef.current = true;
      }
    },
    [disabled, resetPull]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (
        disabled ||
        !isPullingRef.current ||
        startYRef.current === null ||
        isRefreshingRef.current
      ) {
        return;
      }

      if (e.touches.length !== 1) {
        resetPull();
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      const diff = touch.clientY - startYRef.current;
      if (diff > 0 && window.scrollY <= 2) {
        const damped = Math.min(diff * 0.45, pullThreshold * 1.5);
        updatePullDistance(damped);
      } else {
        updatePullDistance(0);
      }
    },
    [disabled, pullThreshold, resetPull, updatePullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullDistanceRef.current >= pullThreshold && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      updatePullDistance(pullThreshold);
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        updatePullDistance(0);
      }
    } else {
      updatePullDistance(0);
    }
  }, [pullThreshold, onRefresh, updatePullDistance]);

  useEffect(() => {
    if (disabled) {
      isPullingRef.current = false;
      startYRef.current = null;
      pullDistanceRef.current = 0;
      return;
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', resetPull);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', resetPull);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, resetPull]);

  const effectivePullDistance = disabled ? 0 : pullDistance;

  return {
    pullDistance: effectivePullDistance,
    isRefreshing,
    isTriggered: effectivePullDistance >= pullThreshold,
  };
}
