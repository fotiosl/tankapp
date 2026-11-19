import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  X,
  Bell,
  BellRing,
  Check,
  SlidersVertical,
  Info,
  TriangleExclamationPoint,
} from 'lucide-react';
import type { FuelType, PriceAlert, UserSettings } from '../types';
import { isFuelType } from '../utils/typeGuards';
import { ModalShell } from './ModalShell';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceAlert: PriceAlert;
  onSavePriceAlert: (alert: PriceAlert) => void;
  userSettings: UserSettings;
  onSaveUserSettings: (settings: UserSettings) => void;
  currentFuelType: FuelType;
}

function PriceAlertModalContent({
  onClose,
  priceAlert,
  onSavePriceAlert,
  userSettings,
  onSaveUserSettings,
  currentFuelType,
}: Omit<PriceAlertModalProps, 'isOpen'>) {
  const supportsNotifications =
    typeof window !== 'undefined' && 'Notification' in window;

  const [enabled, setEnabled] = useState(priceAlert.enabled);
  const [fuelType, setFuelType] = useState<FuelType>(priceAlert.fuelType || currentFuelType);
  const [targetPrice, setTargetPrice] = useState(
    priceAlert.targetPrice ? priceAlert.targetPrice.toFixed(3) : '1.609'
  );
  const [tankVolume, setTankVolume] = useState(userSettings.tankVolumeLiters.toString());
  const [consumption, setConsumption] = useState(userSettings.consumptionPer100Km.toString());
  const [notificationState, setNotificationState] = useState<NotificationPermission>(() =>
    supportsNotifications ? Notification.permission : 'denied'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRequestPermission = async () => {
    if (!supportsNotifications) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationState(perm);
      if (perm === 'granted') {
        setEnabled(true);
      }
    } catch {
      // Ignore permission dialog errors
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    if (!checked) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    if (supportsNotifications && notificationState === 'default') {
      await handleRequestPermission();
    }
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (savedSuccess) return;

    const parsedTarget = Number.parseFloat(targetPrice.replace(',', '.'));
    const parsedVolume = Number.parseFloat(tankVolume.replace(',', '.'));
    const parsedConsumption = Number.parseFloat(consumption.replace(',', '.'));

    onSavePriceAlert({
      enabled,
      fuelType,
      targetPrice:
        Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 1.609,
    });

    onSaveUserSettings({
      tankVolumeLiters: Number.isFinite(parsedVolume)
        ? Math.max(10, Math.min(parsedVolume, 150))
        : 50,
      consumptionPer100Km: Number.isFinite(parsedConsumption)
        ? Math.max(3, Math.min(parsedConsumption, 25))
        : 7.0,
    });

    setSavedSuccess(true);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 550);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/15 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 id="price-alert-modal-title" className="text-lg font-bold leading-tight">
              Wunschpreis &amp; Rechner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preis-Erinnerung &amp; Tank-Einstellungen
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Dialog schließen"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: Wunschpreis-Alarm */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="price-alert-enabled"
              className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Wunschpreis-Alarm
            </label>

            <span className="relative inline-flex items-center">
              <input
                id="price-alert-enabled"
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  void handleToggleEnabled(e.target.checked);
                }}
                className="sr-only peer"
              />
              <span
                aria-hidden="true"
                onClick={() => {
                  void handleToggleEnabled(!enabled);
                }}
                className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer peer peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
              />
            </span>
          </div>

          {enabled && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700/40">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="alert-fuel-type"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Kraftstoff
                  </label>
                  <select
                    id="alert-fuel-type"
                    value={fuelType}
                    onChange={(e) => {
                      if (isFuelType(e.target.value)) {
                        setFuelType(e.target.value);
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="e10">Super E10</option>
                    <option value="e5">Super E5</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="alert-target-price"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Wunschpreis (€)
                  </label>
                  <input
                    id="alert-target-price"
                    type="number"
                    step="0.001"
                    min="0.500"
                    max="5.000"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="1.609"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {!supportsNotifications ? (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <TriangleExclamationPoint className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Nur In-App-Banner aktiv: System-Mitteilungen werden in diesem Browser nicht unterstützt.
                  </span>
                </div>
              ) : notificationState === 'denied' ? (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <TriangleExclamationPoint className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Nur In-App-Banner aktiv: Browser-Mitteilungen sind blockiert. Du kannst sie in den Website-Einstellungen erlauben.
                  </span>
                </div>
              ) : notificationState !== 'granted' ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleRequestPermission();
                  }}
                  className="w-full py-2 bg-sky-500/15 dark:bg-sky-600/20 hover:bg-sky-500/25 dark:hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  🔔 Browser-Mitteilungen zusätzlich erlauben
                </button>
              ) : null}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Hinweis: Zeigt bei geöffneter App sofort ein Treffer-Banner (plus optionale Browser-/PWA-Mitteilung), sobald eine geöffnete Tankstelle deinen Wunschpreis erreicht.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Umweg-Rechner Parameter */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <SlidersVertical className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            „Lohnt sich der Umweg?“-Parameter
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="tank-volume-input"
                className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                Tankgröße (Liter)
              </label>
              <div className="relative">
                <input
                  id="tank-volume-input"
                  type="number"
                  min="10"
                  max="150"
                  value={tankVolume}
                  onChange={(e) => setTankVolume(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-7 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">
                  L
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="consumption-input"
                className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                Verbrauch / 100km
              </label>
              <div className="relative">
                <input
                  id="consumption-input"
                  type="number"
                  step="0.1"
                  min="3"
                  max="25"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-7 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">
                  L
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            Die App zieht automatisch Spritkosten für zusätzliche Kilometer von der Ersparnis ab.
          </p>
        </div>

        <button
          type="submit"
          disabled={savedSuccess}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-70 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              Einstellungen gespeichert!
            </>
          ) : (
            'Einstellungen speichern'
          )}
        </button>
      </form>
    </>
  );
}

export function PriceAlertModal({ isOpen, onClose, ...rest }: PriceAlertModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="price-alert-modal-title"
      backdropClassName="bg-black/75"
    >
      <PriceAlertModalContent onClose={onClose} {...rest} />
    </ModalShell>
  );
}

export default PriceAlertModal;
