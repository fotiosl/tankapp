import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const FAVORITES_STORAGE_KEY = 'tankapp_favorites';

function parseFavorites(raw: string): string[] | null {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((item): item is string => typeof item === 'string');
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>(
    FAVORITES_STORAGE_KEY,
    [],
    parseFavorites
  );

  const toggleFavorite = useCallback(
    (stationId: string) => {
      setFavoriteIds((prev) =>
        prev.includes(stationId)
          ? prev.filter((id) => id !== stationId)
          : [...prev, stationId]
      );
    },
    [setFavoriteIds]
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  );

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite,
  };
}
