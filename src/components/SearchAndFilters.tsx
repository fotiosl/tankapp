import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Navigation,
  ArrowUpDown,
  X,
  Loader2,
  Star,
  Home,
  Briefcase,
  Route as RouteIcon,
  Check,
} from 'lucide-react';
import type { SortMode, Coordinates, QuickLocation } from '../types';
import { searchAddress, type GeocodeResult } from '../services/api';

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
  // Routen-Modus
  isRouteMode: boolean;
  onToggleRouteMode: (active: boolean) => void;
  routeDestination: Coordinates | null;
  onSelectRouteDestination: (dest: Coordinates | null) => void;
  isLoadingRoute?: boolean;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
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
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<GeocodeResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Routen-Ziel Suche
  const [routeQuery, setRouteQuery] = useState('');
  const [routeResults, setRouteResults] = useState<GeocodeResult[]>([]);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);

  // Schnellwahltasten (Zuhause & Arbeit) im localStorage
  const [quickLocations, setQuickLocations] = useState<{
    home?: QuickLocation;
    work?: QuickLocation;
  }>(() => {
    try {
      const saved = localStorage.getItem('tankapp_quick_locations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveQuickLocation = (id: 'home' | 'work') => {
    const newLoc: QuickLocation = {
      id,
      label: id === 'home' ? 'Zuhause' : 'Arbeit',
      name: currentCoords.name || (id === 'home' ? 'Zuhause' : 'Arbeitsplatz'),
      lat: currentCoords.lat,
      lng: currentCoords.lng,
    };
    const updated = { ...quickLocations, [id]: newLoc };
    setQuickLocations(updated);
    try {
      localStorage.setItem('tankapp_quick_locations', JSON.stringify(updated));
    } catch {}
  };

  const handleSelectQuickLocation = (id: 'home' | 'work') => {
    const loc = quickLocations[id];
    if (loc) {
      onSelectCoords({
        lat: loc.lat,
        lng: loc.lng,
        name: `${loc.label} (${loc.name.split(',')[0]})`,
      });
    } else {
      // Wenn noch nicht gesetzt, speichere aktuellen Standort dafür
      saveQuickLocation(id);
    }
  };

  const handleLocationSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const results = await searchAddress(locationQuery);
      setLocationResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingLocation(false);
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
    setLocationResults([]);
    setLocationQuery('');
  };

  const handleRouteSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeQuery.trim()) return;
    setIsSearchingRoute(true);
    try {
      const results = await searchAddress(routeQuery);
      setRouteResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingRoute(false);
    }
  };

  const handleSelectRouteDest = (result: GeocodeResult) => {
    const shortName = result.displayName.split(',').slice(0, 2).join(', ');
    onSelectRouteDestination({
      lat: result.lat,
      lng: result.lng,
      name: shortName,
    });
    setRouteResults([]);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Switcher: Umkreis vs. Route */}
      <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
        <button
          onClick={() => onToggleRouteMode(false)}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
            !isRouteMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Umkreis-Suche</span>
        </button>

        <button
          onClick={() => onToggleRouteMode(true)}
          className={`py-1.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
            isRouteMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RouteIcon className="w-3.5 h-3.5" />
          <span>Entlang Route</span>
        </button>
      </div>

      {/* Current Location Pill & Location Switcher */}
      <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="truncate font-medium">
            {isRouteMode ? `Start: ${currentCoords.name || `${currentCoords.lat.toFixed(3)}, ${currentCoords.lng.toFixed(3)}`}` : currentCoords.name || `${currentCoords.lat.toFixed(3)}, ${currentCoords.lng.toFixed(3)}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowLocationSearch(!showLocationSearch)}
            className="px-2 py-1 bg-slate-700/70 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
          >
            Ort ändern
          </button>
          <button
            onClick={onRefreshLocation}
            disabled={isLoadingLocation}
            className="p-1 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="GPS-Standort abfragen"
          >
            {isLoadingLocation ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Schnellwahltasten: Zuhause & Arbeit */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[11px] text-slate-400 font-medium shrink-0">Schnellwahl:</span>
        <button
          onClick={() => handleSelectQuickLocation('home')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            quickLocations.home
              ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700'
              : 'bg-slate-900/60 text-slate-400 border-dashed border-slate-700 hover:text-slate-200'
          }`}
          title={quickLocations.home ? `Zu ${quickLocations.home.name} wechseln` : 'Aktuellen Standort als Zuhause speichern'}
        >
          <Home className="w-3 h-3 text-sky-400" />
          <span>{quickLocations.home ? 'Zuhause' : '+ Zuhause'}</span>
        </button>

        <button
          onClick={() => handleSelectQuickLocation('work')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            quickLocations.work
              ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700'
              : 'bg-slate-900/60 text-slate-400 border-dashed border-slate-700 hover:text-slate-200'
          }`}
          title={quickLocations.work ? `Zu ${quickLocations.work.name} wechseln` : 'Aktuellen Standort als Arbeit speichern'}
        >
          <Briefcase className="w-3 h-3 text-amber-400" />
          <span>{quickLocations.work ? 'Arbeit' : '+ Arbeit'}</span>
        </button>
      </div>

      {/* Optional Location Search Bar */}
      {showLocationSearch && (
        <div className="bg-slate-800/95 p-3 rounded-2xl border border-slate-700 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          <form onSubmit={handleLocationSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Stadt, PLZ oder Adresse eingeben..."
                className="w-full bg-slate-900/90 text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 border border-slate-700 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingLocation}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
            >
              {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suchen'}
            </button>
            <button
              type="button"
              onClick={() => setShowLocationSearch(false)}
              className="p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {locationResults.length > 0 && (
            <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
              {locationResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-700/60 text-xs text-slate-200 transition truncate cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{r.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Routen-Ziel Suche (wenn Route-Modus aktiv) */}
      {isRouteMode && (
        <div className="bg-slate-850 bg-slate-900/80 p-3 rounded-2xl border border-blue-500/40 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-300 flex items-center gap-1.5">
              <RouteIcon className="w-4 h-4 text-blue-400" />
              Zielort eingeben (z.B. Frankfurt, Köln, München)
            </span>
            {routeDestination && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" />
                {routeDestination.name}
              </span>
            )}
          </div>

          <form onSubmit={handleRouteSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={routeQuery}
                onChange={(e) => setRouteQuery(e.target.value)}
                placeholder="Zielort eingeben..."
                className="w-full bg-slate-950 text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 border border-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingRoute}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
            >
              {isSearchingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ziel suchen'}
            </button>
          </form>

          {routeResults.length > 0 && (
            <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
              {routeResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectRouteDest(r)}
                  className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition truncate cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{r.displayName}</span>
                </button>
              ))}
            </div>
          )}

          {isLoadingRoute && (
            <div className="flex items-center gap-2 text-xs text-blue-300 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
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
            placeholder="Name oder Marke (z.B. Aral, Shell, Jet)..."
            className="w-full bg-slate-800/80 text-sm text-slate-100 placeholder-slate-400 rounded-xl pl-10 pr-9 py-2.5 border border-slate-700/70 focus:outline-none focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Favoriten Filter Button */}
        <button
          onClick={() => onOnlyFavoritesChange(!onlyFavorites)}
          className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
            onlyFavorites
              ? 'bg-amber-500/25 border-amber-400/80 text-amber-300 shadow-sm shadow-amber-500/20'
              : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:text-amber-300 hover:border-amber-500/40'
          }`}
          title="Nur gespeicherte Favoriten anzeigen"
        >
          <Star className={`w-4 h-4 transition-colors ${onlyFavorites ? 'fill-amber-400 text-amber-400' : 'text-amber-400/80'}`} />
          <span className="hidden sm:inline">Favoriten</span>
          {favoriteCount > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
              {favoriteCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
            showAdvanced || radiusKm !== 5 || onlyOpen
              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
              : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:text-white'
          }`}
          title="Filter & Radius anpassen"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Beliebte Marken-Schnellfilter (Chips) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
        <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-0.5">
          Marke:
        </span>
        {['Aral', 'Shell', 'JET', 'Total', 'Esso', 'HEM', 'star'].map((brand) => {
          const isSelected = searchTerm.trim().toLowerCase() === brand.toLowerCase();
          return (
            <button
              key={brand}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onSearchTermChange('');
                } else {
                  onSearchTermChange(brand);
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-600/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/70 hover:text-white'
              }`}
            >
              {brand}
            </button>
          );
        })}
      </div>

      {/* Expandable Filter Box (Radius Slider & Toggles) */}
      {showAdvanced && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 shadow-lg">
          {/* Radius Slider (nur im Umkreis-Modus) */}
          {!isRouteMode ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Suchradius</span>
                <span className="font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30">
                  {radiusKm} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={radiusKm}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>1 km</span>
                <span className="text-blue-300 font-medium">Standard 5 km</span>
                <span>10 km</span>
                <span>Max 25 km</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-blue-300 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40">
              Im Routen-Modus wird ein Korridor von 4 km entlang der Fahrstrecke durchsucht.
            </div>
          )}

          {/* Sort & Status Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
            {/* Sort Mode Button */}
            <button
              onClick={() => onSortModeChange(sortMode === 'price' ? 'dist' : 'price')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 rounded-lg text-xs text-slate-200 transition cursor-pointer font-medium"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
              <span>Sortierung: {sortMode === 'price' ? 'Günstigste zuerst' : 'Nächste zuerst'}</span>
            </button>

            {/* Only Open Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => onOnlyOpenChange(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-500 cursor-pointer"
              />
              <span>Nur geöffnete</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

