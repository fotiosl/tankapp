import { useState, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'tankapp_favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((stationId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite: (id: string) => favoriteIds.includes(id),
  };
}
