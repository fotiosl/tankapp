import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  List,
  Map as MapIcon,
  RefreshCw,
  AlertTriangle,
  SearchX,
  Compass,
} from 'lucide-react';
import type { Coordinates, FuelType, PriceAlert, SortMode, Station, UserSettings } from './types';
import { fetchStations, fetchStationsAlongRoute } from './services/api';
import { Header } from './components/Header';
import { FuelSelector } from './components/FuelSelector';
import { SearchAndFilters } from './components/SearchAndFilters';
import { StationCard } from './components/StationCard';
import { MapView } from './components/MapView';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { getFuelPrice } from './utils/formatters';
import { DEFAULT_USER_SETTINGS } from './utils/calculator';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useFavorites } from './hooks/useFavorites';
import { useTheme } from './hooks/useTheme';
import { useGeolocation } from './hooks/useGeolocation';

export const App: React.FC = () => {
  // Theme & Custom Hooks
  const { theme, toggleTheme } = useTheme();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const {
    coords,
    setCoords,
    hasResolvedInitialLocation,
    isLoadingLocation,
    locationError,
    setLocationError,
    requestCurrentLocation,
  } = useGeolocation();

  // Kraftstoffart
  const [fuelType, setFuelType] = useState<FuelType>(() => {
    try {
      const saved = localStorage.getItem('tankapp_fuel_type');
      if (saved === 'diesel' || saved === 'e10' || saved === 'e5') return saved;
    } catch {}
    return 'diesel';
  });

  const handleFuelTypeChange = (newFuel: FuelType) => {
    setFuelType(newFuel);
    try {
      localStorage.setItem('tankapp_fuel_type', newFuel);
    } catch {}
  };

  // Suche & Filter
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    try {
      return localStorage.getItem('tankapp_search_term') || '';
    } catch {
      return '';
    }
  });

  const handleSearchTermChange = (newTerm: string) => {
    setSearchTerm(newTerm);
    try {
      localStorage.setItem('tankapp_search_term', newTerm);
    } catch {}
  };

  const [radiusKm, setRadiusKm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tankapp_radius_km');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 1 && val <= 25) return val;
      }
    } catch {}
    return 5;
  });

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    try {
      localStorage.setItem('tankapp_radius_km', newRadius.toString());
    } catch {}
  };

  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem('tankapp_sort_mode');
      if (saved === 'price' || saved === 'dist') return saved;
    } catch {}
    return 'price';
  });

  const handleSortModeChange = (newSort: SortMode) => {
    setSortMode(newSort);
    try {
      localStorage.setItem('tankapp_sort_mode', newSort);
    } catch {}
  };

  const [onlyOpen, setOnlyOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tankapp_only_open');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const handleOnlyOpenChange = (newOnlyOpen: boolean) => {
    setOnlyOpen(newOnlyOpen);
    try {
      localStorage.setItem('tankapp_only_open', String(newOnlyOpen));
    } catch {}
  };

  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Routen-Modus
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [routeDest, setRouteDest] = useState<Coordinates | null>(null);

  // User-Einstellungen für Umweg-Rechner
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('tankapp_user_settings');
      return saved ? JSON.parse(saved) : DEFAULT_USER_SETTINGS;
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  });

  const handleSaveUserSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    try {
      localStorage.setItem('tankapp_user_settings', JSON.stringify(newSettings));
    } catch {}
  };

  // Wunschpreis-Alarm
  const [priceAlert, setPriceAlert] = useState<PriceAlert>(() => {
    try {
      const saved = localStorage.getItem('tankapp_price_alert');
      return saved ? JSON.parse(saved) : { enabled: false, fuelType: 'diesel', targetPrice: 1.609 };
    } catch {
      return { enabled: false, fuelType: 'diesel', targetPrice: 1.609 };
    }
  });

  const handleSavePriceAlert = (alert: PriceAlert) => {
    setPriceAlert(alert);
    try {
      localStorage.setItem('tankapp_price_alert', JSON.stringify(alert));
    } catch {}
  };

  // Stations State
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);

  // Tankstellen-Daten laden (Umkreis oder entlang Route)
  const loadStationsData = useCallback(async () => {
    setIsLoadingStations(true);
    setFetchError(null);
    try {
      let data: Station[];
      if (isRouteMode && routeDest) {
        data = await fetchStationsAlongRoute(coords, routeDest);
      } else {
        data = await fetchStations(coords, radiusKm);
      }
      setStations(data);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unerwarteter Fehler beim Laden';
      setFetchError(message);
    } finally {
      setIsLoadingStations(false);
    }
  }, [coords, radiusKm, isRouteMode, routeDest]);

  // Erst laden, wenn der Start-Standort initial ermittelt wurde
  useEffect(() => {
    if (hasResolvedInitialLocation) {
      loadStationsData();
    }
  }, [hasResolvedInitialLocation, loadStationsData]);

  // Pull-to-Refresh auf mobilen Endgeräten
  const { pullDistance, isRefreshing: isPullRefreshing, isTriggered } = usePullToRefresh({
    onRefresh: loadStationsData,
  });

  // Wunschpreis-Prüfung & Notification
  useEffect(() => {
    if (!priceAlert.enabled || stations.length === 0) return;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    let cheapestHit: { name: string; price: number } | null = null;
    for (const s of stations) {
      const p = getFuelPrice(s, priceAlert.fuelType);
      if (p !== null && p <= priceAlert.targetPrice) {
        if (!cheapestHit || p < cheapestHit.price) {
          cheapestHit = { name: s.name, price: p };
        }
      }
    }

    if (cheapestHit) {
      const lastNotified = localStorage.getItem('tankapp_last_alert_time');
      const now = Date.now();
      if (!lastNotified || now - Number(lastNotified) > 1000 * 60 * 60 * 4) {
        try {
          new Notification(`⛽ Wunschpreis erreicht: ${cheapestHit.price.toFixed(3).replace('.', ',')} €!`, {
            body: `${cheapestHit.name} hat deinen Wunschpreis unterschritten!`,
            icon: '/icon-192.svg',
          });
          localStorage.setItem('tankapp_last_alert_time', now.toString());
        } catch {}
      }
    }
  }, [stations, priceAlert]);

  // Gefilterte und sortierte Tankstellen
  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return stations
      .filter((station) => {
        // Favoriten Filter
        if (onlyFavorites && !favoriteIds.includes(station.id)) {
          return false;
        }

        // Suchfilter nach Name oder Marke
        if (term) {
          const nameMatch = station.name?.toLowerCase().includes(term);
          const brandMatch = station.brand?.toLowerCase().includes(term);
          const streetMatch = station.street?.toLowerCase().includes(term);
          if (!nameMatch && !brandMatch && !streetMatch) return false;
        }

        // Nur geöffnete filtern
        if (onlyOpen && !station.isOpen) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = getFuelPrice(a, fuelType);
        const priceB = getFuelPrice(b, fuelType);

        if (sortMode === 'price') {
          // Fix: Geöffnete Tankstellen immer vor geschlossenen einsortieren!
          if (a.isOpen !== b.isOpen) {
            return a.isOpen ? -1 : 1;
          }
          if (priceA !== null && priceB !== null) {
            if (Math.abs(priceA - priceB) > 0.0001) {
              return priceA - priceB;
            }
            return a.dist - b.dist;
          }
          if (priceA !== null) return -1;
          if (priceB !== null) return 1;
          return a.dist - b.dist;
        }

        return a.dist - b.dist;
      });
  }, [stations, searchTerm, onlyOpen, onlyFavorites, favoriteIds, sortMode, fuelType]);

  // Minimaler Preis für den ausgewählten Kraftstoff
  const minPrice = useMemo(() => {
    let min: number | null = null;
    filteredStations.forEach((s) => {
      const p = getFuelPrice(s, fuelType);
      if (p !== null && (min === null || p < min)) {
        min = p;
      }
    });
    return min;
  }, [filteredStations, fuelType]);

  // Nächstgelegene Station für Umweg-Berechnung
  const closestStation = useMemo(() => {
    return (
      stations
        .filter((s) => s.isOpen && getFuelPrice(s, fuelType) !== null)
        .sort((a, b) => a.dist - b.dist)[0] || null
    );
  }, [stations, fuelType]);

  const closestStationPrice = useMemo(() => {
    return closestStation ? getFuelPrice(closestStation, fuelType) : null;
  }, [closestStation, fuelType]);

  const minDist = closestStation ? closestStation.dist : 0;

  return (
    <div
      className={`min-h-screen ${
        theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      } flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors`}
    >
      {/* Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenPriceAlert={() => setIsPriceAlertOpen(true)}
        isAlertActive={priceAlert.enabled}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-3 space-y-3.5 pb-24">
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold py-1.5 transition-all"
            style={{ opacity: Math.min(pullDistance / 50, 1) }}
          >
            <RefreshCw
              className={`w-4 h-4 text-blue-400 ${
                isTriggered || isPullRefreshing ? 'animate-spin text-emerald-400' : ''
              }`}
            />
            <span>
              {isPullRefreshing
                ? 'Preise werden aktualisiert...'
                : isTriggered
                ? 'Loslassen zum Aktualisieren'
                : 'Nach unten ziehen...'}
            </span>
          </div>
        )}

        {/* Kraftstoff-Auswahl (Diesel, Super E10, Super E5) */}
        <FuelSelector selectedFuel={fuelType} onSelectFuel={handleFuelTypeChange} />

        {/* Suchleiste, Favoriten, Radius, Schnellwahl & Filter */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchTermChange={handleSearchTermChange}
          radiusKm={radiusKm}
          onRadiusChange={handleRadiusChange}
          sortMode={sortMode}
          onSortModeChange={handleSortModeChange}
          onlyOpen={onlyOpen}
          onOnlyOpenChange={handleOnlyOpenChange}
          currentCoords={coords}
          onSelectCoords={(newCoords) => setCoords(newCoords)}
          onRefreshLocation={requestCurrentLocation}
          isLoadingLocation={isLoadingLocation}
          onlyFavorites={onlyFavorites}
          onOnlyFavoritesChange={setOnlyFavorites}
          favoriteCount={favoriteIds.length}
          isRouteMode={isRouteMode}
          onToggleRouteMode={(val) => {
            setIsRouteMode(val);
            if (!val) setRouteDest(null);
          }}
          routeDestination={routeDest}
          onSelectRouteDestination={(dest) => {
            setRouteDest(dest);
          }}
          isLoadingRoute={isLoadingStations && isRouteMode}
        />

        {/* Fehler-Meldung bei GPS */}
        {locationError && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-2.5 text-xs text-amber-200 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              {locationError}
            </span>
            <button
              onClick={() => setLocationError(null)}
              className="text-[10px] text-amber-400 font-bold underline cursor-pointer"
            >
              Ausblenden
            </button>
          </div>
        )}

        {/* Statuszeile & Ansichts-Umschaltung (Liste / Karte) */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 dark:text-slate-300">
              {filteredStations.length}{' '}
              {filteredStations.length === 1 ? 'Tankstelle' : 'Tankstellen'}{' '}
              {onlyFavorites ? 'in Favoriten' : isRouteMode ? 'auf Route' : 'gefunden'}
            </span>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400">
                • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
            )}
          </div>

          {/* View Mode Toggle: Liste / Karte */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Karte</span>
            </button>
          </div>
        </div>

        {/* API-Fehler Hinweis */}
        {fetchError && (
          <div className="bg-rose-950/50 border border-rose-800 rounded-2xl p-4 text-xs text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Fehler beim Laden der Preise
            </div>
            <p className="leading-relaxed">{fetchError}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={loadStationsData}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        )}

        {/* Content View: Liste oder Karte */}
        {viewMode === 'map' ? (
          <MapView
            stations={filteredStations}
            userCoords={coords}
            selectedFuel={fuelType}
            minPrice={minPrice}
            onCenterUser={requestCurrentLocation}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <div className="space-y-3">
            {isLoadingStations && stations.length === 0 ? (
              // Loading Skeletons
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-700 rounded w-2/3" />
                    <div className="h-8 bg-slate-700/60 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : filteredStations.length > 0 ? (
              // Station Cards List
              filteredStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  selectedFuel={fuelType}
                  minPrice={minPrice}
                  minDist={minDist}
                  closestStationPrice={closestStationPrice}
                  userSettings={userSettings}
                  isFavorite={favoriteIds.includes(station.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            ) : (
              // No Results Found
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">
                  {onlyFavorites ? 'Keine Favoriten gefunden' : 'Keine Tankstellen gefunden'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {onlyFavorites
                    ? 'Tippe auf den Stern bei beliebigen Tankstellen, um sie zu deinen Favoriten hinzuzufügen.'
                    : isRouteMode
                    ? 'Auf der eingegebenen Fahrstrecke wurden keine geöffneten Tankstellen gefunden.'
                    : `Im Umkreis von ${radiusKm} km wurden mit den aktuellen Filtern keine Tankstellen gefunden.`}
                </p>
                <button
                  onClick={() => {
                    handleSearchTermChange('');
                    handleOnlyOpenChange(false);
                    setOnlyFavorites(false);
                    handleRadiusChange(15);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {onlyFavorites ? 'Alle Tankstellen anzeigen' : 'Filter zurücksetzen & Radius vergrößern'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Refresh Action Button at bottom */}
      <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none flex justify-center px-4 pb-safe">
        <button
          onClick={loadStationsData}
          disabled={isLoadingStations}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-blue-600/95 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-2xl shadow-blue-600/50 backdrop-blur-md border border-blue-400/30 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStations ? 'animate-spin' : ''}`} />
          <span>{isLoadingStations ? 'Lade Preise...' : 'Preise aktualisieren'}</span>
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onKeySaved={loadStationsData}
      />

      {/* Price Alert & Calculator Modal */}
      <PriceAlertModal
        isOpen={isPriceAlertOpen}
        onClose={() => setIsPriceAlertOpen(false)}
        priceAlert={priceAlert}
        onSavePriceAlert={handleSavePriceAlert}
        userSettings={userSettings}
        onSaveUserSettings={handleSaveUserSettings}
        currentFuelType={fuelType}
      />

      {/* iPhone PWA Install Guide Modal */}
      <PWAInstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
      />
    </div>
  );
};

export default App;
