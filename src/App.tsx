import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  List,
  Map as MapIcon,
  RefreshCw,
  AlertTriangle,
  SearchX,
  Compass,
} from 'lucide-react';
import type {
  Coordinates,
  FuelType,
  PriceAlert,
  SortMode,
  Station,
  UserSettings,
} from './types';
import {
  fetchProxyStatus,
  fetchStations,
  fetchStationsAlongRoute,
  getApiStatus,
} from './services/api';
import { Header } from './components/Header';
import { FuelSelector } from './components/FuelSelector';
import { SearchAndFilters } from './components/SearchAndFilters';
import { StationCard } from './components/StationCard';
import { MapView } from './components/MapView';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { formatPrice, getFuelPrice } from './utils/formatters';
import { DEFAULT_USER_SETTINGS } from './utils/calculator';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useFavorites } from './hooks/useFavorites';
import { useTheme } from './hooks/useTheme';
import { useGeolocation } from './hooks/useGeolocation';
import { useLocalStorage } from './hooks/useLocalStorage';

const parseFuelType = (raw: string): FuelType | null =>
  raw === 'diesel' || raw === 'e10' || raw === 'e5' ? raw : null;

const parseRawString = (raw: string): string => raw;

const parseRadius = (raw: string): number | null => {
  const val = Number(raw);
  return Number.isFinite(val) && val >= 1 && val <= 25 ? val : null;
};

const parseSortMode = (raw: string): SortMode | null =>
  raw === 'price' || raw === 'dist' ? raw : null;

const parseOnlyOpen = (raw: string): boolean | null =>
  raw === 'true' ? true : raw === 'false' ? false : null;

const DEFAULT_PRICE_ALERT: PriceAlert = {
  enabled: false,
  fuelType: 'diesel',
  targetPrice: 1.609,
};

export const App: React.FC = () => {
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

  // Persistierte Nutzer-Einstellungen
  const [fuelType, setFuelType] = useLocalStorage<FuelType>(
    'tankapp_fuel_type',
    'diesel',
    parseFuelType
  );
  const [searchTerm, setSearchTerm] = useLocalStorage<string>(
    'tankapp_search_term',
    '',
    parseRawString
  );
  const [radiusKm, setRadiusKm] = useLocalStorage<number>(
    'tankapp_radius_km',
    5,
    parseRadius
  );
  const [sortMode, setSortMode] = useLocalStorage<SortMode>(
    'tankapp_sort_mode',
    'price',
    parseSortMode
  );
  const [onlyOpen, setOnlyOpen] = useLocalStorage<boolean>(
    'tankapp_only_open',
    true,
    parseOnlyOpen
  );
  const [userSettings, setUserSettings] = useLocalStorage<UserSettings>(
    'tankapp_user_settings',
    DEFAULT_USER_SETTINGS
  );
  const [priceAlert, setPriceAlert] = useLocalStorage<PriceAlert>(
    'tankapp_price_alert',
    DEFAULT_PRICE_ALERT
  );

  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Routen-Modus
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [routeDest, setRouteDest] = useState<Coordinates | null>(null);

  // API-Status (Proxy vs. Custom vs. Demo)
  const [proxyConfigured, setProxyConfigured] = useState<boolean | null>(null);
  const [apiModeVersion, setApiModeVersion] = useState(0);

  const apiStatus = useMemo(
    () => {
      void apiModeVersion;
      return getApiStatus(proxyConfigured);
    },
    [proxyConfigured, apiModeVersion]
  );

  // Stations State
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const forceNextRefreshRef = useRef(false);

  // Prüfe Proxy-Verfügbarkeit einmalig beim Start
  useEffect(() => {
    const controller = new AbortController();
    fetchProxyStatus(controller.signal).then((configured) => {
      if (!controller.signal.aborted) {
        setProxyConfigured(configured);
      }
    });
    return () => controller.abort();
  }, []);

  // Tankstellen laden bei relevanten Änderungen (mit AbortController gegen Race Conditions)
  useEffect(() => {
    if (!hasResolvedInitialLocation) return;
    if (isRouteMode && !routeDest) return;

    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    const forceRefresh = forceNextRefreshRef.current;
    forceNextRefreshRef.current = false;

    const runFetch = async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;

      setIsLoadingStations(true);
      setFetchError(null);

      try {
        const data =
          isRouteMode && routeDest
            ? await fetchStationsAlongRoute(coords, routeDest, 4, {
                forceRefresh,
                signal: controller.signal,
              })
            : await fetchStations(coords, radiusKm, {
                forceRefresh,
                signal: controller.signal,
              });

        if (controller.signal.aborted) return;
        setStations(data);
        setLastUpdated(new Date());
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const message =
          err instanceof Error ? err.message : 'Unerwarteter Fehler beim Laden';
        setFetchError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingStations(false);
        }
      }
    };

    void runFetch();

    return () => {
      controller.abort();
    };
  }, [hasResolvedInitialLocation, coords, radiusKm, isRouteMode, routeDest, refreshNonce]);

  const handleManualRefresh = useCallback(() => {
    forceNextRefreshRef.current = true;
    setRefreshNonce((n) => n + 1);
  }, []);

  const handleApiModeChanged = useCallback(() => {
    setApiModeVersion((v) => v + 1);
    forceNextRefreshRef.current = true;
    setRefreshNonce((n) => n + 1);
  }, []);

  // Pull-to-Refresh auf mobilen Endgeräten (deaktiviert in Kartenansicht und bei offenen Modals)
  const {
    pullDistance,
    isRefreshing: isPullRefreshing,
    isTriggered,
  } = usePullToRefresh({
    onRefresh: handleManualRefresh,
    disabled: viewMode === 'map' || isSettingsOpen || isInstallGuideOpen || isPriceAlertOpen,
  });

  // Wunschpreis-Prüfung & Browser-Notification (nur geöffnete Stationen)
  useEffect(() => {
    if (!priceAlert.enabled || stations.length === 0) return;
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    let cheapestHit: { name: string; price: number } | null = null;
    for (const s of stations) {
      if (!s.isOpen) continue;
      const p = getFuelPrice(s, priceAlert.fuelType);
      if (p !== null && p <= priceAlert.targetPrice) {
        if (!cheapestHit || p < cheapestHit.price) {
          cheapestHit = { name: s.name, price: p };
        }
      }
    }

    if (cheapestHit) {
      const alertSignature = `${priceAlert.fuelType}:${priceAlert.targetPrice.toFixed(3)}`;
      const lastNotifiedRaw = localStorage.getItem('tankapp_last_alert_meta');
      const now = Date.now();
      let shouldNotify = true;

      if (lastNotifiedRaw) {
        try {
          const parsed = JSON.parse(lastNotifiedRaw) as { sig?: string; time?: number };
          if (
            parsed.sig === alertSignature &&
            typeof parsed.time === 'number' &&
            now - parsed.time <= 1000 * 60 * 60 * 4
          ) {
            shouldNotify = false;
          }
        } catch {
          // Ignore corrupted alert meta
        }
      }

      if (shouldNotify) {
        try {
          new Notification(
            `⛽ Wunschpreis erreicht: ${formatPrice(cheapestHit.price, 3)}!`,
            {
              body: `${cheapestHit.name} hat deinen Wunschpreis unterschritten!`,
              icon: '/icon-192.png',
            }
          );
          localStorage.setItem(
            'tankapp_last_alert_meta',
            JSON.stringify({ sig: alertSignature, time: now })
          );
        } catch {
          // Ignore notification constructor errors (e.g. mobile browsers)
        }
      }
    }
  }, [stations, priceAlert]);

  // Gefilterte und sortierte Tankstellen
  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return stations
      .filter((station) => {
        if (onlyFavorites && !favoriteIds.includes(station.id)) {
          return false;
        }

        if (term) {
          const nameMatch = station.name?.toLowerCase().includes(term);
          const brandMatch = station.brand?.toLowerCase().includes(term);
          const streetMatch = station.street?.toLowerCase().includes(term);
          if (!nameMatch && !brandMatch && !streetMatch) return false;
        }

        if (onlyOpen && !station.isOpen) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = getFuelPrice(a, fuelType);
        const priceB = getFuelPrice(b, fuelType);

        if (sortMode === 'price') {
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
        theme === 'light'
          ? 'bg-slate-100 text-slate-900'
          : 'bg-slate-950 text-slate-100'
      } flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors`}
    >
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenPriceAlert={() => setIsPriceAlertOpen(true)}
        isAlertActive={priceAlert.enabled}
        isDemoMode={apiStatus.isDemo}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-3 space-y-3.5 pb-24">
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold py-1.5 transition-all"
            style={{ opacity: Math.min(pullDistance / 50, 1) }}
          >
            <RefreshCw
              className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${
                isTriggered || isPullRefreshing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''
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

        <FuelSelector selectedFuel={fuelType} onSelectFuel={setFuelType} />

        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onlyOpen={onlyOpen}
          onOnlyOpenChange={setOnlyOpen}
          currentCoords={coords}
          onSelectCoords={setCoords}
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
          onSelectRouteDestination={setRouteDest}
          isLoadingRoute={isLoadingStations && isRouteMode}
        />

        {/* Fehler-Meldung bei GPS */}
        {locationError && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              {locationError}
            </span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-[10px] text-amber-700 dark:text-amber-400 font-bold underline cursor-pointer shrink-0"
            >
              Ausblenden
            </button>
          </div>
        )}

        {/* Statuszeile & Ansichts-Umschaltung */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {filteredStations.length}{' '}
              {filteredStations.length === 1 ? 'Tankstelle' : 'Tankstellen'}{' '}
              {onlyFavorites ? 'in Favoriten' : isRouteMode ? 'auf Route' : 'gefunden'}
            </span>
            {lastUpdated && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 flex gap-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              aria-pressed={viewMode === 'map'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Karte</span>
            </button>
          </div>
        </div>

        {/* API-Fehler Hinweis */}
        {fetchError && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-xs text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Fehler beim Laden der Preise
            </div>
            <p className="leading-relaxed">{fetchError}</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualRefresh}
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
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                    <div className="h-8 bg-slate-100 dark:bg-slate-700/60 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : filteredStations.length > 0 ? (
              filteredStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  selectedFuel={fuelType}
                  minPrice={minPrice}
                  minDist={minDist}
                  closestStationPrice={closestStationPrice}
                  userSettings={userSettings}
                  isRouteMode={isRouteMode}
                  isFavorite={favoriteIds.includes(station.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-200 text-base">
                  {onlyFavorites ? 'Keine Favoriten gefunden' : 'Keine Tankstellen gefunden'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {onlyFavorites
                    ? 'Tippe auf den Stern bei beliebigen Tankstellen, um sie zu deinen Favoriten hinzuzufügen.'
                    : isRouteMode && !routeDest
                    ? 'Bitte oben einen Zielort suchen und auswählen, um Tankstellen entlang der Route zu laden.'
                    : isRouteMode
                    ? 'Auf der eingegebenen Fahrstrecke wurden mit den aktuellen Filtern keine Tankstellen gefunden.'
                    : `Im Umkreis von ${radiusKm} km wurden mit den aktuellen Filtern keine Tankstellen gefunden.`}
                </p>
                {!(isRouteMode && !routeDest) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setOnlyOpen(false);
                      setOnlyFavorites(false);
                      if (!isRouteMode && radiusKm < 15) {
                        setRadiusKm(15);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {onlyFavorites
                      ? 'Alle Tankstellen anzeigen'
                      : isRouteMode
                      ? 'Filter zurücksetzen'
                      : 'Filter zurücksetzen & Radius vergrößern'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Refresh Action Button at bottom */}
      <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none flex justify-center px-4 pb-safe">
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isLoadingStations || (isRouteMode && !routeDest)}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-blue-600/95 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-2xl shadow-blue-600/40 backdrop-blur-md border border-blue-400/30 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStations ? 'animate-spin' : ''}`} />
          <span>{isLoadingStations ? 'Lade Preise...' : 'Preise aktualisieren'}</span>
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onModeChanged={handleApiModeChanged}
        apiStatus={apiStatus}
      />

      <PriceAlertModal
        isOpen={isPriceAlertOpen}
        onClose={() => setIsPriceAlertOpen(false)}
        priceAlert={priceAlert}
        onSavePriceAlert={setPriceAlert}
        userSettings={userSettings}
        onSaveUserSettings={setUserSettings}
        currentFuelType={fuelType}
      />

      <PWAInstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
      />
    </div>
  );
};

export default App;
