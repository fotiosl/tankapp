import { X, Share, SquarePlus, Smartphone, Wifi, Download } from 'lucide-react';
import { ModalShell } from './ModalShell';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  canPromptNativeInstall?: boolean;
  onTriggerNativeInstall?: () => Promise<boolean>;
}

export function PWAInstallGuideModal({
  isOpen,
  onClose,
  canPromptNativeInstall = false,
  onTriggerNativeInstall,
}: PWAInstallGuideModalProps) {
  const handleNativeInstall = async () => {
    if (!onTriggerNativeInstall) return;
    const accepted = await onTriggerNativeInstall();
    if (accepted) {
      onClose();
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="pwa-install-modal-title"
      backdropClassName="bg-black/75"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/15 dark:bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 id="pwa-install-modal-title" className="text-lg font-bold leading-tight">
              App installieren (PWA)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ohne App Store direkt auf dem Homescreen
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Anleitung schließen"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Native 1-Click Install Prompt (Android Chrome / Desktop Edge & Chrome) */}
      {canPromptNativeInstall && onTriggerNativeInstall && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 space-y-2.5">
          <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed">
            Dein Browser unterstützt die direkte 1-Klick-Installation auf den Startbildschirm oder Desktop:
          </p>
          <button
            type="button"
            onClick={() => {
              void handleNativeInstall();
            }}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            TankApp jetzt installieren
          </button>
        </div>
      )}

      {/* iPhone / Safari Steps */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Anleitung für iPhone (Safari)
        </p>

        <div className="flex items-start gap-3.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
          <div className="w-7 h-7 rounded-full bg-blue-500/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
            1
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-slate-900 dark:text-slate-200">
              In Safari auf dem iPhone öffnen
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Öffne die Webadresse der App im vorinstallierten Apple <strong>Safari-Browser</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
          <div className="w-7 h-7 rounded-full bg-blue-500/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
            2
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <span>Auf „Teilen“ tippen</span>
              <Share className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Tippe in der unteren Safari-Menüleiste auf das Quadrat mit dem nach oben zeigenden Pfeil.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
          <div className="w-7 h-7 rounded-full bg-blue-500/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
            3
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <span>„Zum Home-Bildschirm“</span>
              <SquarePlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Scrolle im Menü etwas herunter und tippe auf <strong>„Zum Home-Bildschirm“</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
          <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/40">
            4
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-slate-900 dark:text-slate-200">
              Oben rechts auf „Hinzufügen“
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Bestätige mit <strong>Hinzufügen</strong>. TankApp startet danach im Vollbildmodus direkt vom Homescreen.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 text-xs space-y-1.5">
        <div className="font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          Hinweis zu GPS &amp; Offline-Nutzung
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
          Die Standortermittlung per GPS funktioniert aus Sicherheitsgründen unter iOS ausschließlich über eine verschlüsselte HTTPS-Verbindung. Ohne Internetverbindung zeigt TankApp automatisch die zuletzt geladenen Preise an.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
      >
        Verstanden &amp; Schließen
      </button>
    </ModalShell>
  );
}

export default PWAInstallGuideModal;
