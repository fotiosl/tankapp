import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Coordinates, FuelType, Station } from '../types';
import { getFuelPrice, openNavigation } from '../utils/formatters';
import { Navigation } from 'lucide-react';

interface MapViewProps {
  stations: Station[];
  userCoords: Coordinates;
  selectedFuel: FuelType;
  minPrice: number | null;
  onCenterUser: () => void;
  favoriteIds?: string[];
  onToggleFavorite?: (stationId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  stations,
  userCoords,
  selectedFuel,
  minPrice,
  onCenterUser,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userCoords.lat, userCoords.lng],
      zoom: 13,
      zoomControl: false,
    });

    // Dark-mode styled OpenStreetMap or standard tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user position marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindTooltip('Dein Standort', { permanent: false, direction: 'top' });
    }
  }, [userCoords.lat, userCoords.lng]);

  // Update station markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    stations.forEach((station) => {
      const isFav = favoriteIds.includes(station.id);
      const price = getFuelPrice(station, selectedFuel);
      const isCheapest =
        price !== null && minPrice !== null && Math.abs(price - minPrice) < 0.001;

      const priceText = price ? `${price.toFixed(2)}€` : 'k.A.';
      const badgeBg = isCheapest ? '#10b981' : station.isOpen ? '#1e293b' : '#64748b';
      const badgeBorder = isFav ? '#f59e0b' : isCheapest ? '#34d399' : '#475569';

      const customIcon = L.divIcon({
        className: 'price-marker',
        html: `
          <div style="
            background: ${badgeBg};
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            font-family: -apple-system, sans-serif;
            padding: 3px 6px;
            border-radius: 8px;
            border: ${isFav ? '2px solid #f59e0b' : `1.5px solid ${badgeBorder}`};
            box-shadow: 0 4px 8px rgba(0,0,0,0.35);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 3.5px;
          ">
            ${isFav ? '<span style="color: #f59e0b; font-size: 12px; line-height: 1;">★</span>' : ''}
            <span>${station.brand || station.name.split(' ')[0]}</span>
            <span style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 4px; color: ${isCheapest ? '#a7f3d0' : '#38bdf8'}">${priceText}</span>
          </div>
        `,
        iconSize: [isFav ? 88 : 80, 26],
        iconAnchor: [isFav ? 44 : 40, 13],
      });

      const favBtnBg = isFav ? 'rgba(245, 158, 11, 0.2)' : '#1e293b';
      const favBtnBorder = isFav ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.4)';
      const favBtnColor = isFav ? '#fbbf24' : '#fde68a';

      const popupContent = `
        <div style="font-family: -apple-system, sans-serif; min-width: 190px; padding: 2px;">
          <div style="font-size: 13px; font-weight: bold; color: #f8fafc; margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; gap: 4px;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${station.name}</span>
            ${isFav ? '<span style="color: #f59e0b; font-size: 13px;">★</span>' : ''}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">
            ${station.street} ${station.houseNumber || ''}, ${station.place} (${station.dist.toFixed(1)} km)
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: #0f172a; padding: 4px 8px; border-radius: 6px;">
            <span style="font-size: 11px; color: #cbd5e1; text-transform: uppercase; font-weight: 600;">${selectedFuel}:</span>
            <span style="font-size: 14px; font-weight: bold; color: ${isCheapest ? '#34d399' : '#38bdf8'};">
              ${price ? `${price.toFixed(3)} €` : 'Keine Angabe'}
            </span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button 
              onclick="window.toggleStationFav('${station.id}')"
              style="flex: 1; background: ${favBtnBg}; color: ${favBtnColor}; border: 1px solid ${favBtnBorder}; padding: 6px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 3px;"
              title="${isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}"
            >
              ${isFav ? '★ Favorit' : '☆ Merken'}
            </button>
            <button 
              onclick="window.openNavTo('${station.lat}', '${station.lng}', '${encodeURIComponent(station.name)}')"
              style="flex: 1; background: #2563eb; color: white; border: none; padding: 6px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;"
            >
              Route
            </button>
          </div>
        </div>
      `;

      L.marker([station.lat, station.lng], { icon: customIcon })
        .addTo(markersLayerRef.current!)
        .bindPopup(popupContent);
    });
  }, [stations, selectedFuel, minPrice, favoriteIds]);

  // Hook global handler for popup buttons (route & favorite)
  useEffect(() => {
    (window as any).openNavTo = (latStr: string, lngStr: string, nameEsc: string) => {
      openNavigation(parseFloat(latStr), parseFloat(lngStr), decodeURIComponent(nameEsc));
    };
    (window as any).toggleStationFav = (id: string) => {
      if (onToggleFavorite) {
        onToggleFavorite(id);
      }
    };
    return () => {
      delete (window as any).openNavTo;
      delete (window as any).toggleStationFav;
    };
  }, [onToggleFavorite]);

  const handleCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 13);
    }
    onCenterUser();
  };

  return (
    <div className="relative w-full h-[65vh] min-h-[400px] rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Center Button */}
      <button
        onClick={handleCenter}
        className="absolute bottom-4 right-4 z-[400] p-3 bg-slate-900/90 hover:bg-slate-800 text-white rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        title="Auf meinen Standort zentrieren"
      >
        <Navigation className="w-4 h-4 text-blue-400" />
        <span>Mein Standort</span>
      </button>
    </div>
  );
};
