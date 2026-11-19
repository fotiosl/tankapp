import { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Navigation,
  ArrowUpDown,
  X,
  LoaderCircle,
  Star,
  House,
  Briefcase,
  Route as RouteIcon,
  Check,
  Trash,
} from 'lucide-react';
import type { SortMode, Coordinates, QuickLocation } from '../types';
import type { GeocodeResult } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { BRAND_CHIPS } from '../utils/brandStyles';
import { isRecord, parseJsonSafe } from '../utils/typeGuards';
import { AddressSearchBox } from './AddressSearchBox';

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  radiusKm: number;
  onRadiusChange: (val: number) => void;
  sortMode: SortMode;
  onSortModeChange: (val: SortMode) => void;
  onlyOpen: boolean;
  onOnlyOpenChange: (val: boolean) => void;
  currentCoords: Coordinates;
  onSelectCoords: (coords: Coordinates) => void;
  onRefreshLocation: () => void;
  isLoadingLocation: boolean;
  onlyFavorites: boolean;
  onOnlyFavoritesChange: (val: boolean) => void;
  favoriteCount: number;
  isRouteMode: boolean;
  onToggleRouteMode: (active: boolean) => void;
  routeDestination: Coordinates | null;
  onSelectRouteDestination: (dest: Coordinates | null) => void;
  isLoadingRoute?: boolean;
}

type QuickLocationsMap = {
  home?: QuickLocation;
  work?: QuickLocation;
};

function isValidQuickLocation(val: unknown, expectedId: 'home' | 'work'): val is QuickLocation {
  if (!isRecord(val)) return false;
  return (
    val.id === expectedId &&
    typeof val.label === 'string' &&
    typeof val.name === 'string' &&
    typeof val.lat === 'number' &&
    typeof val.lng === 'number' &&
    Number.isFinite(val.lat) &&
    Number.isFinite(val.lng)
  );
}

function parseQuickLocations(raw: string): QuickLocationsMap | null {
  const parsed = parseJsonSafe(raw);
  if (!isRecord(parsed)) return null;
  const result: QuickLocationsMap = {};
  if (isValidQuickLocation(parsed.home, 'home')) result.home = parsed.home;
  if (isValidQuickLocation(parsed.work, 'work')) result.work = parsed.work;
  return result;
}

function stripQuickLabelPrefix(name: string): string {
  const match = /^(?:Zuhause|Arbeit)\s*\((.+)\)$/.exec(name.trim());
  return match?.[1]?.trim() || name.trim();
}

export function SearchAndFilters({
  searchTerm,
  onSearchTermChange,
  radiusKm,
  onRadiusChange,
  sortMode,
  onSortModeChange,
  onlyOpen,
  onOnlyOpenChange,
  currentCoords,
  onSelectCoords,
  onRefreshLocation,
  isLoadingLocation,
  onlyFavorites,
  onOnlyFavoritesChange,
  favoriteCount,
  isRouteMode,
  onToggleRouteMode,
  routeDestination,
  onSelectRouteDestination,
  isLoadingRoute = false,
}: SearchAndFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [savedQuickFeedback, setSavedQuickFeedback] = useState<'home' | 'work' | null>(null);
  const quickFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entkoppelter Slider-State mit Debounce verhindert 15–20 API-Aufrufe beim Ziehen
  const [draftRadius, setDraftRadius] = useState<number>(radiusKm);
  const [prevPropRadius, setPrevPropRadius] = useState<number>(radiusKm);
  if (radiusKm !== prevPropRadius) {
    setPrevPropRadius(radiusKm);
    setDraftRadius(radiusKm);
  }

  const radiusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRadiusChangeRef = useRef(onRadiusChange);

  useEffect(() => {
    onRadiusChangeRef.current = onRadiusChange;
  }, [onRadiusChange]);

  useEffect(() => {
    return () => {
      if (radiusDebounceRef.current !== null) {
        clearTimeout(radiusDebounceRef.current);
      }
      if (quickFeedbackTimerRef.current !== null) {
        clearTimeout(quickFeedbackTimerRef.current);
      }
    };
  }, []);

  const commitRadiusImmediately = (val: number) => {
    if (radiusDebounceRef.current !== null) {
      clearTimeout(radiusDebounceRef.current);
      radiusDebounceRef.current = null;
    }
    if (val !== radiusKm) {
      onRadiusChangeRef.current(val);
    }
  };

  const handleSliderChange = (val: number) => {
    setDraftRadius(val);
    if (radiusDebounceRef.current !== null) {
      clearTimeout(radiusDebounceRef.current);
    }
    radiusDebounceRef.current = setTimeout(() => {
      radiusDebounceRef.current = null;
      onRadiusChangeRef.current(val);
    }, 300);
  };

  const [quickLocations, setQuickLocations] = useLocalStorage<QuickLocationsMap>(
    'tankapp_quick_locations',
    {},
    parseQuickLocations
  );

  const saveQuickLocation = (id: 'home' | 'work') => {
    const cleanName = currentCoords.name
      ? stripQuickLabelPrefix(currentCoords.name)
      : id === 'home'
      ? 'Zuhause'
      : 'Arbeitsplatz';
    const newLoc: QuickLocation = {
      id,
      label: id === 'home' ? 'Zuhause' : 'Arbeit',
      name: cleanName,
      lat: currentCoords.lat,
      lng: currentCoords.lng,
    };
    setQuickLocations((prev) => ({ ...prev, [id]: newLoc }));
    setSavedQuickFeedback(id);
    if (quickFeedbackTimerRef.current !== null) {
      clearTimeout(quickFeedbackTimerRef.current);
    }
    quickFeedbackTimerRef.current = setTimeout(() => {
      setSavedQuickFeedback(null);
    }, 1800);
  };

  const clearQuickLocation = (id: 'home' | 'work') => {
    setQuickLocations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (savedQuickFeedback === id) {
      setSavedQuickFeedback(null);
      if (quickFeedbackTimerRef.current !== null) {
        clearTimeout(quickFeedbackTimerRef.current);
        quickFeedbackTimerRef.current = null;
      }
    }
  };

  const handleSelectQuickLocation = (id: 'home' | 'work') => {
    const loc = quickLocations[id];
    if (loc) {
      const shortName = loc.name.split(',')[0] ?? loc.name;
      onSelectCoords({
        lat: loc.lat,
        lng: loc.lng,
        name: `${loc.label} (${shortName})`,
      });
    } else {
      saveQuickLocation(id);
    }
  };

  const handleSelectResult = (result: GeocodeResult) => {
    const shortName = result.displayName.split(',').slice(0, 2).join(', ');
    onSelectCoords({
      lat: result.lat,
      lng: result.lng,
      name: shortName,
    });
    setShowLocationSearch(false);
  };

  const handleSelectRouteDest = (result: GeocodeResult) => {
    const shortName = result.displayName.split(',').slice(0, 2).join(', ');
    onSelectRouteDestination({
      lat: result.lat,
      lng: result.lng,
      name: shortName,
    });
  };

  const handleSwapStartAndDest = () => {
    if (!routeDestination) return;
    const prevStart = currentCoords;
    onSelectCoords(routeDestination);
    onSelectRouteDestination(prevStart);
  };

  const coordsLabel =
    currentCoords.name || `${currentCoords.lat.toFixed(3)}, ${currentCoords.lng.toFixed(3)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Switcher: Umkreis vs. Route */}
      <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
        <button
          type="button"
          onClick={() => onToggleRouteMode(false)}
          aria-pressed={!isRouteMode}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
            !isRouteMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Umkreis-Suche</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleRouteMode(true)}
          aria-pressed={isRouteMode}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
            isRouteMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RouteIcon className="w-3.5 h-3.5" />
          <span>Entlang Route</span>
        </button>
      </div>

      {/* Current Location Pill & Location Switcher */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700/60 text-xs shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
          <MapPin className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
          <span className="truncate font-medium">
            {isRouteMode ? `Start: ${coordsLabel}` : coordsLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowLocationSearch(!showLocationSearch)}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
          >
            Ort ändern
          </button>
          <button
            type="button"
            onClick={onRefreshLocation}
            disabled={isLoadingLocation}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer disabled:opacity-50"
            title="GPS-Standort abfragen"
            aria-label="Aktuellen GPS-Standort abfragen"
          >
            {isLoadingLocation ? (
              <LoaderCircle className="w-3.5 h-3.5 animate-spin text-blue-500 dark:text-blue-400" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Schnellwahltasten: Zuhause & Arbeit */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
          Schnellwahl:
        </span>

        {(['home', 'work'] as const).map((id) => {
          const saved = quickLocations[id];
          const label = id === 'home' ? 'Zuhause' : 'Arbeit';
          const Icon = id === 'home' ? House : Briefcase;
          const iconColor =
            id === 'home'
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-amber-600 dark:text-amber-400';

          return (
            <div key={id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => handleSelectQuickLocation(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-semibold transition cursor-pointer ${
                  saved
                    ? 'rounded-l-lg bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    : 'rounded-lg bg-white/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-dashed border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={
                  saved
                    ? `Zu ${saved.name} wechseln`
                    : `Aktuellen Standort (${coordsLabel}) als ${label} speichern`
                }
              >
                <Icon className={`w-3 h-3 ${iconColor}`} />
                <span>
                  {savedQuickFeedback === id
                    ? `${label} gespeichert ✓`
                    : saved
                    ? label
                    : `+ ${label}`}
                </span>
              </button>
              {saved && (
                <button
                  type="button"
                  onClick={() => clearQuickLocation(id)}
                  title={`${label}-Speicherpunkt löschen`}
                  aria-label={`${label}-Speicherpunkt löschen`}
                  className="px-1.5 py-1 rounded-r-lg border border-l-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional Location Search Bar */}
      {showLocationSearch && (
        <div className="bg-white dark:bg-slate-800/95 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-2.5 animate-zoom-in">
          <AddressSearchBox
            placeholder="Stadt, PLZ oder Adresse eingeben..."
            submitLabel="Suchen"
            onSelect={handleSelectResult}
            onClose={() => setShowLocationSearch(false)}
            focusOnMount
          />
        </div>
      )}

      {/* Routen-Ziel Suche (wenn Route-Modus aktiv) */}
      {isRouteMode && (
        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-blue-500/40 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <RouteIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              Zielort eingeben (z.B. Frankfurt, Köln, München)
            </span>
            {routeDestination && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {routeDestination.name}
                </span>
                <button
                  type="button"
                  onClick={handleSwapStartAndDest}
                  title="Start und Ziel tauschen"
                  aria-label="Start und Ziel tauschen"
                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectRouteDestination(null)}
                  title="Zielort entfernen"
                  aria-label="Zielort entfernen"
                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <AddressSearchBox
            placeholder="Zielort eingeben..."
            submitLabel="Ziel suchen"
            onSelect={handleSelectRouteDest}
            pinColorClass="text-emerald-600 dark:text-emerald-400"
          />

          {isLoadingRoute && (
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 py-1">
              <LoaderCircle className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Suche Tankstellen entlang der Fahrtstrecke...</span>
            </div>
          )}
        </div>
      )}

      {/* Main Search Input & Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Name, Straße, Ort oder Marke (z.B. Aral, Shell)..."
            aria-label="Tankstellen nach Name, Straße, Ort oder Marke filtern"
            className="w-full bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-700/70 focus:outline-none focus:border-blue-500 transition shadow-sm dark:shadow-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchTermChange('')}
              aria-label="Suchfeld leeren"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Favoriten Filter Button */}
        <button
          type="button"
          onClick={() => onOnlyFavoritesChange(!onlyFavorites)}
          aria-pressed={onlyFavorites}
          className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shrink-0 shadow-sm dark:shadow-none ${
            onlyFavorites
              ? 'bg-amber-500/20 dark:bg-amber-500/25 border-amber-500/70 dark:border-amber-400/80 text-amber-700 dark:text-amber-300 shadow-amber-500/15'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/40'
          }`}
          title="Nur gespeicherte Favoriten anzeigen"
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              onlyFavorites
                ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400'
                : 'text-amber-500/80 dark:text-amber-400/80'
            }`}
          />
          <span className="hidden sm:inline">Favoriten</span>
          {favoriteCount > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
              {favoriteCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shrink-0 shadow-sm dark:shadow-none ${
            showAdvanced || radiusKm !== 5 || !onlyOpen
              ? 'bg-blue-600/15 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-blue-400'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Filter & Radius anpassen"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Beliebte Marken-Schnellfilter (Chips) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0 mr-0.5">
          Marke:
        </span>
        {BRAND_CHIPS.map((brand) => {
          const isSelected = searchTerm.trim().toLowerCase() === brand.toLowerCase();
          return (
            <button
              key={brand}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSearchTermChange(isSelected ? '' : brand)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-600/30'
                  : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {brand}
            </button>
          );
        })}
      </div>

      {/* Expandable Filter Box (Radius Slider & Toggles) */}
      {showAdvanced && (
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-3.5 animate-zoom-in shadow-lg">
          {!isRouteMode ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label
                  htmlFor="radius-slider"
                  className="font-semibold text-slate-700 dark:text-slate-300"
                >
                  Suchradius
                </label>
                <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30">
                  {draftRadius} km
                </span>
              </div>
              <input
                id="radius-slider"
                type="range"
                min="1"
                max="25"
                step="1"
                value={draftRadius}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                onPointerUp={() => commitRadiusImmediately(draftRadius)}
                onKeyUp={() => commitRadiusImmediately(draftRadius)}
                onBlur={() => commitRadiusImmediately(draftRadius)}
                className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>1 km</span>
                <span className="text-blue-600 dark:text-blue-300 font-medium">Standard 5 km</span>
                <span>10 km</span>
                <span>Max 25 km</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/40">
              Im Routen-Modus wird ein Korridor von 4 km entlang der Luftlinie durchsucht.
            </div>
          )}

          {/* Sort & Status Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => onSortModeChange(sortMode === 'price' ? 'dist' : 'price')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 transition cursor-pointer font-medium"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Sortierung: {sortMode === 'price' ? 'Günstigste zuerst' : 'Nächste zuerst'}
              </span>
            </button>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => onOnlyOpenChange(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span>Nur geöffnete</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
