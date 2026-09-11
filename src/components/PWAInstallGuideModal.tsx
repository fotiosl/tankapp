import React from 'react';
import { X, Share, PlusSquare, Smartphone, Wifi } from 'lucide-react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">iPhone Installation</h2>
              <p className="text-xs text-slate-400">Ohne App Store direkt auf dem Homescreen</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5">
          <div className="flex items-start gap-3.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
              1
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-200">In Safari auf dem iPhone öffnen</p>
              <p className="text-slate-400">
                Öffne die Webadresse der App im vorinstallierten Apple <strong>Safari-Browser</strong> (nicht in Chrome oder Firefox).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
              2
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Auf „Teilen“ tippen</span>
                <Share className="w-3.5 h-3.5 text-sky-400" />
              </p>
              <p className="text-slate-400">
                Tippe in der unteren Safari-Menüleiste auf das Quadrat mit dem nach oben zeigenden Pfeil.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
              3
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span>„Zum Home-Bildschirm“</span>
                <PlusSquare className="w-3.5 h-3.5 text-sky-400" />
              </p>
              <p className="text-slate-400">
                Scrolle im Menü etwas herunter und tippe auf den Eintrag <strong>„Zum Home-Bildschirm“</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-full bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/40">
              4
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-200">Oben rechts auf „Hinzufügen“</p>
              <p className="text-slate-400">
                Bestätige mit <strong>Hinzufügen</strong>. Die App erscheint als vollwertige Kachel auf deinem Homescreen.
              </p>
            </div>
          </div>
        </div>

        {/* Local Network / Deployment Tip */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-sky-300 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            Wie rufst du die App auf deinem iPhone auf?
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            <strong>Lokaler Test:</strong> Wenn dein PC und dein iPhone im selben WLAN sind, erreichst du die App über die IP-Adresse deines PCs (z.B. <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">http://192.168.x.x:5173</code>).
          </p>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            <strong>Für unterwegs (überall erreichbar):</strong> Wir können die App kostenlos mit Vercel oder Cloudflare online schalten – dann hast du deine eigene feste URL (z.B. <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">https://meinetankapp.vercel.app</code>) und kannst überall im Auto tanken!
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
        >
          Verstanden & Schließen
        </button>
      </div>
    </div>
  );
};
