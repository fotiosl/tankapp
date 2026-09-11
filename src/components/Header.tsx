import React from 'react';
import { Fuel, KeyRound, Sparkles, Smartphone } from 'lucide-react';
import { isUsingDemoKey, hasEnvApiKey } from '../services/api';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenInstallGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenInstallGuide }) => {
  const isDemo = isUsingDemoKey();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 pt-safe pb-3">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* App Title & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              TankApp
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Spritpreise in Echtzeit</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isDemo && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-full hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Klicke hier um deinen eigenen API-Key einzutragen"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-medium">Demo-Modus</span>
              <span className="sm:hidden font-medium">Demo</span>
            </button>
          )}

          <button
            onClick={onOpenInstallGuide}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
            title="Auf iPhone installieren"
          >
            <Smartphone className="w-5 h-5 text-sky-400" />
          </button>

          {(!hasEnvApiKey() || isDemo) && (
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
              title="API-Key Einstellungen"
            >
              <KeyRound className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
