import React, { useState } from 'react';
import { X, Bell, BellRing, Check, Sliders, Info } from 'lucide-react';
import type { FuelType, PriceAlert, UserSettings } from '../types';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceAlert: PriceAlert;
  onSavePriceAlert: (alert: PriceAlert) => void;
  userSettings: UserSettings;
  onSaveUserSettings: (settings: UserSettings) => void;
  currentFuelType: FuelType;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  priceAlert,
  onSavePriceAlert,
  userSettings,
  onSaveUserSettings,
  currentFuelType,
}) => {
  const [enabled, setEnabled] = useState(priceAlert.enabled);
  const [fuelType, setFuelType] = useState<FuelType>(priceAlert.fuelType || currentFuelType);
  const [targetPrice, setTargetPrice] = useState(priceAlert.targetPrice ? priceAlert.targetPrice.toString() : '1.609');
  const [tankVolume, setTankVolume] = useState(userSettings.tankVolumeLiters.toString());
  const [consumption, setConsumption] = useState(userSettings.consumptionPer100Km.toString());
  const [notificationState, setNotificationState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationState(perm);
      if (perm === 'granted') {
        setEnabled(true);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetPrice.replace(',', '.'));
    const parsedVolume = parseFloat(tankVolume.replace(',', '.'));
    const parsedConsumption = parseFloat(consumption.replace(',', '.'));

    onSavePriceAlert({
      enabled,
      fuelType,
      targetPrice: isNaN(parsedTarget) ? 1.609 : parsedTarget,
    });

    onSaveUserSettings({
      tankVolumeLiters: isNaN(parsedVolume) ? 50 : Math.max(10, Math.min(parsedVolume, 150)),
      consumptionPer100Km: isNaN(parsedConsumption) ? 7.0 : Math.max(3, Math.min(parsedConsumption, 25)),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Wunschpreis & Rechner</h2>
              <p className="text-xs text-slate-400">Push-Mitteilungen & Tank-Einstellungen</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Section 1: Wunschpreis-Alarm */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-sky-400" />
                Wunschpreis-Alarm
              </span>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    if (e.target.checked && notificationState !== 'granted') {
                      handleRequestPermission();
                    }
                    setEnabled(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {enabled && (
              <div className="space-y-3 pt-1 border-t border-slate-700/40">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Kraftstoff
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value as FuelType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="diesel">Diesel</option>
                      <option value="e10">Super E10</option>
                      <option value="e5">Super E5</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Wunschpreis (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="1.60"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {notificationState !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="w-full py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition"
                  >
                    🔔 Mitteilungen auf dem Smartphone erlauben
                  </button>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Benachrichtigt dich auf dem Gerät, sobald beim Aktualisieren der Preise eine Tankstelle deinen Wunschpreis unterschreitet.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Umweg-Rechner Parameter */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              „Lohnt sich der Umweg?“-Parameter
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tankgröße (Liter)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={tankVolume}
                    onChange={(e) => setTankVolume(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">L</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Verbrauch / 100km
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={consumption}
                    onChange={(e) => setConsumption(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">L</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              Die App zieht automatisch Spritkosten für zusätzliche Kilometer von der Ersparnis ab.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
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
      </div>
    </div>
  );
};
