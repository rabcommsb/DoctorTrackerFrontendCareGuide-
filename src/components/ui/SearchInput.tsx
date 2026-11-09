'use client';

import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchInputProps {
  value: string;
  onChange: (debouncedValue: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Search input with a 300ms debounce before invoking `onChange`.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records...',
  delay = 300,
  className = '',
  ariaLabel = 'Search',
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState<string>(value);
  const debouncedValue = useDebounce(localValue, delay);

  // Sync local input state when external value changes (e.g. URL reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Emit debounced value when it settles
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`relative w-full ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full min-h-[40px] pl-9 pr-9 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
