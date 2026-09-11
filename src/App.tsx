import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  List,
  Map as MapIcon,
  RefreshCw,
  AlertTriangle,
  SearchX,
  Compass,
} from 'lucide-react';
import type { Coordinates, FuelType, SortMode, Station } from './types';
import { fetchStations } from './services/api';
import { Header } from './components/Header';
import { FuelSelector } from './components/FuelSelector';
import { SearchAndFilters } from './components/SearchAndFilters';
import { StationCard } from './components/StationCard';
import { MapView } from './components/MapView';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { getFuelPrice } from './utils/formatters';

// Standard-Koordinaten (Berlin Brandenburger Tor), falls GPS noch nicht erlaubt wurde
const DEFAULT_COORDS: Coordinates = {
  lat: 52.5162,
  lng: 13.3777,
  name: 'Berlin Mitte (Standard)',
};

export const App: React.FC = () => {
  const [fuelType, setFuelType] = useState<FuelType>('diesel');
  const [searchTerm, setSearchTerm] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(5); // Standard wie gewünscht 5 km
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [hasResolvedInitialLocation, setHasResolvedInitialLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  // GPS-Standort abrufen (mit automatischem Fallback für Desktop/WLAN)
  const requestCurrentLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Standortermittlung wird von diesem Browser nicht unterstützt.');
      setHasResolvedInitialLocation(true);
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Aktueller GPS-Standort',
          });
          setLocationError(null);
          setIsLoadingLocation(false);
          setHasResolvedInitialLocation(true);
        },
        (err) => {
          // Falls hochpräzises GPS fehlschlägt (z.B. am PC oder bei Timeout), auf Standardgenauigkeit ausweichen
          if (highAccuracy && (err.code === 2 || err.code === 3)) {
            tryGetPosition(false);
            return;
          }

          let msg = 'Standort konnte nicht ermittelt werden.';
          if (err.code === 1) {
            msg = 'Standort-Berechtigung verweigert. Bitte im Browser erlauben oder Ort manuell eingeben.';
          } else if (err.code === 2) {
            msg = 'Position derzeit nicht ermittelbar. Bitte Ortssuche oben nutzen.';
          } else if (err.code === 3) {
            msg = 'Standortabfrage dauerte zu lange. Bitte erneut versuchen.';
          }
          setLocationError(msg);
          setIsLoadingLocation(false);
          setHasResolvedInitialLocation(true);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 5000 : 7000,
          maximumAge: 60000,
        }
      );
    };

    tryGetPosition(true);
  }, []);

  // Beim Start einmal GPS anfordern
  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  // Tankstellen-Daten von Tankerkönig laden
  const loadStationsData = useCallback(async () => {
    setIsLoadingStations(true);
    setFetchError(null);
    try {
      const data = await fetchStations(coords, radiusKm);
      setStations(data);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unerwarteter Fehler beim Laden';
      setFetchError(message);
    } finally {
      setIsLoadingStations(false);
    }
  }, [coords, radiusKm]);

  // Erst laden, wenn der Start-Standort ermittelt wurde (verhindert doppelten API-Aufruf Berlin + GPS)
  useEffect(() => {
    if (hasResolvedInitialLocation) {
      loadStationsData();
    }
  }, [hasResolvedInitialLocation, loadStationsData]);

  // Gefilterte und sortierte Tankstellen
  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return stations
      .filter((station) => {
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
          // Günstigste Preise zuerst
          if (priceA !== null && priceB !== null) {
            if (Math.abs(priceA - priceB) > 0.0001) {
              return priceA - priceB;
            }
            return a.dist - b.dist; // bei gleichem Preis: nähere Station zuerst
          }
          if (priceA !== null) return -1;
          if (priceB !== null) return 1;
          return a.dist - b.dist;
        }

        // Nach Distanz sortieren
        return a.dist - b.dist;
      });
  }, [stations, searchTerm, onlyOpen, sortMode, fuelType]);

  // Minimaler Preis für den aktuell ausgewählten Kraftstoff
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-3 space-y-3.5 pb-24">
        {/* Kraftstoff-Auswahl (Diesel, Super E10, Super E5) */}
        <FuelSelector selectedFuel={fuelType} onSelectFuel={setFuelType} />

        {/* Suchleiste, Radius-Slider (Standard 5km) und Standort-Auswahl */}
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
          onSelectCoords={(newCoords) => setCoords(newCoords)}
          onRefreshLocation={requestCurrentLocation}
          isLoadingLocation={isLoadingLocation}
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
            <span className="text-xs font-bold text-slate-300">
              {filteredStations.length}{' '}
              {filteredStations.length === 1 ? 'Tankstelle' : 'Tankstellen'} gefunden
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
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
              >
                API-Key prüfen
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
                />
              ))
            ) : (
              // No Results Found
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">Keine Tankstellen gefunden</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Im Umkreis von {radiusKm} km wurden mit den aktuellen Filtern keine Tankstellen gefunden.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setOnlyOpen(false);
                    setRadiusKm(15);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Filter zurücksetzen & Radius vergrößern
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

      {/* iPhone PWA Install Guide Modal */}
      <PWAInstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
      />
    </div>
  );
};

export default App;
