import React from 'react';
import type { FuelType } from '../types';

interface FuelSelectorProps {
  selectedFuel: FuelType;
  onSelectFuel: (fuel: FuelType) => void;
}

const fuels: { id: FuelType; label: string; short: string; desc: string }[] = [
  { id: 'diesel', label: 'Diesel', short: 'B7', desc: 'Dieselkraftstoff' },
  { id: 'e10', label: 'Super E10', short: 'E10', desc: 'Bis 10% Ethanol' },
  { id: 'e5', label: 'Super E5', short: 'E5', desc: 'Super 95 Oktan' },
];

export const FuelSelector: React.FC<FuelSelectorProps> = ({ selectedFuel, onSelectFuel }) => {
  return (
    <div
      role="group"
      aria-label="Kraftstoffart wählen"
      className="bg-white dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-1.5 shadow-sm dark:shadow-inner transition-colors"
    >
      {fuels.map((fuel) => {
        const isActive = selectedFuel === fuel.id;
        return (
          <button
            key={fuel.id}
            type="button"
            aria-pressed={isActive}
            title={fuel.desc}
            onClick={() => onSelectFuel(fuel.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="font-bold tracking-wide">{fuel.label}</span>
            <span
              className={`text-[10px] uppercase font-semibold ${
                isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {fuel.short}
            </span>
          </button>
        );
      })}
    </div>
  );
};
