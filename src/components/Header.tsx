import { Fuel, Settings, Sparkles, Smartphone, Bell, BellRing, Sun, Moon } from 'lucide-react';
import type { ThemeMode } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenInstallGuide: () => void;
  onOpenPriceAlert: () => void;
  isAlertActive?: boolean;
  isDemoMode: boolean;
  showInstallButton?: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function Header({
  onOpenSettings,
  onOpenInstallGuide,
  onOpenPriceAlert,
  isAlertActive = false,
  isDemoMode,
  showInstallButton = true,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 pt-safe pb-3 transition-colors">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* App Title & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
              TankApp
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Spritpreise in Echtzeit
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {isDemoMode && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 px-2.5 py-1.5 rounded-full hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Klicke hier, um deinen eigenen API-Key einzutragen"
              aria-label="Demo-Modus aktiv, API-Einstellungen öffnen"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="hidden sm:inline font-medium">Demo-Modus</span>
              <span className="sm:hidden font-medium">Demo</span>
            </button>
          )}

          {/* Theme Toggle (Tag / Nacht Kontrast) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
            title={
              theme === 'dark'
                ? 'Hellen Kontrastmodus für Tageslicht aktivieren'
                : 'Dunklen Modus aktivieren'
            }
            aria-label={theme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenPriceAlert}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
              isAlertActive
                ? 'bg-blue-600/15 dark:bg-blue-600/20 border-blue-500/50 dark:border-blue-500/60 text-blue-700 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700/60'
            }`}
            title="Wunschpreis-Alarm & Tank-Rechner"
            aria-label="Wunschpreis-Alarm und Tank-Rechner öffnen"
          >
            {isAlertActive ? (
              <BellRing className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>

          {showInstallButton && (
            <button
              type="button"
              onClick={onOpenInstallGuide}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
              title="App auf Homescreen installieren"
              aria-label="Installationsanleitung öffnen"
            >
              <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
            title="Einstellungen & API-Key"
            aria-label="Einstellungen und API-Key öffnen"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
