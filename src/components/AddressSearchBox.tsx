import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X, Loader2, AlertCircle } from 'lucide-react';
import { searchAddress, type GeocodeResult } from '../services/api';

interface AddressSearchBoxProps {
  placeholder: string;
  submitLabel: string;
  onSelect: (result: GeocodeResult) => void;
  onClose?: () => void;
  autoFocus?: boolean;
  pinColorClass?: string;
}

export const AddressSearchBox: React.FC<AddressSearchBoxProps> = ({
  placeholder,
  submitLabel,
  onSelect,
  onClose,
  autoFocus = false,
  pinColorClass = 'text-blue-500 dark:text-blue-400',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError('Bitte mindestens 2 Zeichen eingeben.');
      setResults([]);
      setHasSearched(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);

    try {
      const data = await searchAddress(trimmed, controller.signal);
      if (controller.signal.aborted) return;
      setResults(data);
      setHasSearched(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setResults([]);
      setSearchError(err instanceof Error ? err.message : 'Ortssuche fehlgeschlagen.');
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full bg-slate-50 dark:bg-slate-900/90 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500"
            autoFocus={autoFocus}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Suche schließen"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {searchError && (
        <p className="text-xs text-rose-600 dark:text-rose-300 flex items-center gap-1.5 px-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{searchError}</span>
        </p>
      )}

      {!searchError && hasSearched && results.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          Keine passenden Orte in Deutschland gefunden.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              type="button"
              onClick={() => {
                onSelect(r);
                setResults([]);
                setHasSearched(false);
                setQuery('');
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-700/60 text-xs text-slate-800 dark:text-slate-200 transition truncate cursor-pointer flex items-center gap-2"
            >
              <MapPin className={`w-3.5 h-3.5 ${pinColorClass} shrink-0`} />
              <span className="truncate">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
