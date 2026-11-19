import { useEffect, useMemo } from 'react';
import type { PriceAlert, Station } from '../types';
import { formatPrice, getFuelPrice } from '../utils/formatters';
import { isRecord, parseJsonSafe } from '../utils/typeGuards';

export interface PriceAlertHit {
  stationId: string;
  stationName: string;
  price: number;
  count: number;
}

const ALERT_META_KEY = 'tankapp_last_alert_meta';
const COOLDOWN_MS = 1000 * 60 * 60 * 4;

async function showBrowserOrSwNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    tag: 'tankapp-price-alert',
  };

  // Auf Android Chrome & iOS PWAs ist ServiceWorkerRegistration.showNotification() erforderlich
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, options);
        return;
      }
    } catch {
      // Fallback auf Desktop Notification API
    }
  }

  try {
    const notification = new Notification(title, options);
    void notification;
  } catch {
    // Ignore constructor errors on platforms requiring SW notifications
  }
}

export function usePriceAlert(stations: Station[], priceAlert: PriceAlert): PriceAlertHit | null {
  const alertHit = useMemo<PriceAlertHit | null>(() => {
    if (!priceAlert.enabled || stations.length === 0) return null;

    let cheapest: { id: string; name: string; price: number } | null = null;
    let count = 0;

    for (const station of stations) {
      if (!station.isOpen) continue;
      const price = getFuelPrice(station, priceAlert.fuelType);
      if (price !== null && price <= priceAlert.targetPrice) {
        count += 1;
        if (!cheapest || price < cheapest.price) {
          cheapest = { id: station.id, name: station.name, price };
        }
      }
    }

    if (!cheapest) return null;
    return {
      stationId: cheapest.id,
      stationName: cheapest.name,
      price: cheapest.price,
      count,
    };
  }, [stations, priceAlert]);

  useEffect(() => {
    if (!alertHit) return;
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const alertSignature = `${priceAlert.fuelType}:${priceAlert.targetPrice.toFixed(3)}`;
    const now = Date.now();
    let shouldNotify = true;

    try {
      const lastNotifiedRaw = localStorage.getItem(ALERT_META_KEY);
      if (lastNotifiedRaw) {
        const parsed = parseJsonSafe(lastNotifiedRaw);
        if (
          isRecord(parsed) &&
          parsed.sig === alertSignature &&
          typeof parsed.time === 'number' &&
          now - parsed.time <= COOLDOWN_MS
        ) {
          shouldNotify = false;
        }
      }
    } catch {
      // Ignore storage / parse errors
    }

    if (!shouldNotify) return;

    const title = `⛽ Wunschpreis erreicht: ${formatPrice(alertHit.price, 3)}!`;
    const body = `${alertHit.stationName} hat deinen Wunschpreis unterschritten!`;

    void showBrowserOrSwNotification(title, body).then(() => {
      try {
        localStorage.setItem(
          ALERT_META_KEY,
          JSON.stringify({ sig: alertSignature, time: now })
        );
      } catch {
        // Ignore storage errors
      }
    });
  }, [alertHit, priceAlert.fuelType, priceAlert.targetPrice]);

  return alertHit;
}
