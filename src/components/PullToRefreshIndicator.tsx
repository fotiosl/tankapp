import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshIndicatorProps {
  onRefresh: () => Promise<void>;
  disabled: boolean;
}

export function PullToRefreshIndicator({
  onRefresh,
  disabled,
}: PullToRefreshIndicatorProps) {
  const { pullDistance, isRefreshing, isTriggered } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  if (pullDistance <= 0) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold py-1.5 transition-all"
      style={{ opacity: Math.min(pullDistance / 50, 1) }}
    >
      <RefreshCw
        className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${
          isTriggered || isRefreshing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''
        }`}
      />
      <span>
        {isRefreshing
          ? 'Preise werden aktualisiert...'
          : isTriggered
          ? 'Loslassen zum Aktualisieren'
          : 'Nach unten ziehen...'}
      </span>
    </div>
  );
}
