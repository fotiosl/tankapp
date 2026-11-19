import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  X,
  KeyRound,
  ExternalLink,
  Check,
  CircleExclamationPoint,
  LoaderCircle,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { ApiStatusInfo } from '../types';
import {
  enableDemoMode,
  enableStandardProxyMode,
  getCustomApiKey,
  getDevEnvApiKey,
  saveApiKey,
  validateApiKey,
} from '../services/api';
import { ModalShell } from './ModalShell';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModeChanged: () => void;
  apiStatus: ApiStatusInfo;
}

function SettingsModalContent({
  onClose,
  onModeChanged,
  apiStatus,
}: Omit<SettingsModalProps, 'isOpen'>) {
  const [apiKey, setApiKey] = useState(() => getCustomApiKey());
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  const scheduleClose = (delayMs: number) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onModeChanged();
      onClose();
    }, delayMs);
  };

  const hasDevKey = Boolean(getDevEnvApiKey());
  const isProxyOrDevConfigured = apiStatus.proxyConfigured === true || hasDevKey;
  const isBusy = status.type === 'loading' || status.type === 'success';

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    const clean = apiKey.trim();

    if (!clean) {
      if (isProxyOrDevConfigured) {
        enableStandardProxyMode();
        setStatus({ type: 'success', message: 'Standard-Proxy wieder aktiviert.' });
      } else {
        enableDemoMode(true);
        setStatus({ type: 'success', message: 'Eigener Key entfernt – Demo-Modus aktiviert.' });
      }
      scheduleClose(700);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus({ type: 'loading', message: 'Prüfe API-Key mit Tankerkönig...' });
    try {
      const result = await validateApiKey(clean, controller.signal);
      if (controller.signal.aborted) return;

      if (result.valid) {
        saveApiKey(clean);
        setStatus({
          type: 'success',
          message: 'API-Key erfolgreich gespeichert und verifiziert!',
        });
        scheduleClose(800);
      } else {
        setStatus({
          type: 'error',
          message: result.message || 'Der eingegebene API-Key ist ungültig.',
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Prüfung fehlgeschlagen.',
      });
    }
  };

  const handleUseDemo = () => {
    if (isBusy) return;
    enableDemoMode(false);
    setStatus({ type: 'success', message: 'Demo-Modus aktiv (Testdaten).' });
    scheduleClose(600);
  };

  const handleUseStandardProxy = () => {
    if (isBusy) return;
    enableStandardProxyMode();
    setApiKey('');
    setStatus({
      type: 'success',
      message: isProxyOrDevConfigured ? 'Server-Proxy wieder aktiv.' : 'Eigener Key gelöscht.',
    });
    scheduleClose(600);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/15 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 id="settings-modal-title" className="text-lg font-bold leading-tight">
              Einstellungen &amp; API
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tankerkönig Preis-Schnittstelle
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Einstellungen schließen"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status / Info Box */}
      {apiStatus.mode === 'demo' ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Demo-Modus aktiv</p>
            <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed text-[11px]">
              Es werden Testdaten von Tankerkönig geladen. Aktiviere den Server-Proxy oder trage einen eigenen Key ein, um Live-Preise abzurufen.
            </p>
          </div>
        </div>
      ) : apiStatus.mode === 'custom' ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200/90 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Persönlicher API-Key aktiv
            </p>
            <p className="text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed text-[11px]">
              Anfragen werden direkt mit deinem lokal im Browser gespeicherten Tankerkönig-Key ausgeführt.
            </p>
          </div>
        </div>
      ) : isProxyOrDevConfigured ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200/90 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              {apiStatus.proxyConfigured
                ? 'API-Key über Vercel-Proxy aktiv'
                : 'Lokaler API-Key (.env) aktiv'}
            </p>
            <p className="text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed text-[11px]">
              {apiStatus.proxyConfigured
                ? 'Dein Tankerkönig-Key ist serverseitig als Umgebungsvariable hinterlegt und geschützt aktiv.'
                : 'Deine lokale Entwicklungs-Umgebungsvariable wird verwendet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200/90 space-y-2">
          <div className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Kostenloser persönlicher API-Key
          </div>
          <p className="leading-relaxed">
            Aktuell ist kein Server-Key konfiguriert (Demo-Modus). Für echte, minutengenaue Spritpreise benötigst du einen kostenlosen Tankerkönig API-Key.
          </p>
          <a
            href="https://creativecommons.tankerkoenig.de/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
          >
            Hier kostenlos anfordern
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          void handleSave(e);
        }}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="tankapp-api-key-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Persönlicher API-Key
          </label>
          <div className="relative">
            <input
              id="tankapp-api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isBusy}
              placeholder="z.B. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wider disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Key verbergen' : 'Key anzeigen'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              title={showKey ? 'Key verbergen' : 'Key anzeigen'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Wird nur lokal im Browser (localStorage) gespeichert.
          </p>
        </div>

        {status.message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              status.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : status.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {status.type === 'loading' && (
              <LoaderCircle className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            {status.type === 'success' && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            {status.type === 'error' && (
              <CircleExclamationPoint className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/25 cursor-pointer flex items-center justify-center gap-2"
          >
            {status.type === 'loading' ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Prüfe Key...
              </>
            ) : (
              'Key prüfen & speichern'
            )}
          </button>

          {(apiStatus.hasCustomKey || (apiStatus.mode === 'demo' && isProxyOrDevConfigured)) && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleUseStandardProxy}
              className="w-full py-2 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {isProxyOrDevConfigured
                ? 'Standard-Proxy nutzen (Live-Daten)'
                : 'Eigenen Key löschen'}
            </button>
          )}

          {apiStatus.mode !== 'demo' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleUseDemo}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Demo-Modus verwenden (Testdaten)
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export function SettingsModal({
  isOpen,
  onClose,
  onModeChanged,
  apiStatus,
}: SettingsModalProps) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} titleId="settings-modal-title">
      <SettingsModalContent
        onClose={onClose}
        onModeChanged={onModeChanged}
        apiStatus={apiStatus}
      />
    </ModalShell>
  );
}

export default SettingsModal;
