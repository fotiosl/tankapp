import React, { useState } from 'react';
import { X, KeyRound, ExternalLink, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getStoredApiKey, saveApiKey, validateApiKey, DEMO_API_KEY } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey() === DEMO_API_KEY ? '' : getStoredApiKey());
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = apiKey.trim();

    if (!clean) {
      saveApiKey('');
      setStatus({ type: 'success', message: 'Demo-Key aktiviert.' });
      setTimeout(() => {
        onKeySaved();
        onClose();
      }, 800);
      return;
    }

    setStatus({ type: 'loading', message: 'Prüfe API-Key mit Tankerkönig...' });
    const result = await validateApiKey(clean);

    if (result.valid) {
      saveApiKey(clean);
      setStatus({ type: 'success', message: 'API-Key erfolgreich gespeichert und verifiziert!' });
      setTimeout(() => {
        onKeySaved();
        onClose();
      }, 900);
    } else {
      setStatus({
        type: 'error',
        message: result.message || 'Der eingegebene API-Key ist ungültig.',
      });
    }
  };

  const handleUseDemo = () => {
    saveApiKey('');
    setApiKey('');
    setStatus({ type: 'success', message: 'Demo-Modus aktiv.' });
    setTimeout(() => {
      onKeySaved();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Einstellungen & API</h2>
              <p className="text-xs text-slate-400">Tankerkönig Preis-Schnittstelle</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-950/40 border border-blue-800/40 rounded-2xl p-4 text-xs text-blue-200/90 space-y-2">
          <div className="font-semibold text-blue-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Kostenloser persönlicher API-Key
          </div>
          <p className="leading-relaxed">
            Für echte, minutengenaue Spritpreise benötigst du einen kostenlosen Tankerkönig API-Key.
          </p>
          <a
            href="https://creativecommons.tankerkoenig.de/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
          >
            Hier in 1 Minute kostenlos anfordern
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Persönlicher API-Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="z.B. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Wird sicher lokal auf deinem Gerät gespeichert.
            </p>
          </div>

          {/* Status Message */}
          {status.message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                status.type === 'error'
                  ? 'bg-red-950/50 border border-red-800 text-red-300'
                  : status.type === 'success'
                  ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}
            >
              {status.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />}
              {status.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              {status.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={status.type === 'loading'}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              {status.type === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Prüfe Key...
                </>
              ) : (
                'Key prüfen & speichern'
              )}
            </button>

            <button
              type="button"
              onClick={handleUseDemo}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Demo-Modus verwenden (Testdaten)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
