'use client';

import React from 'react';
import { Calendar, X } from 'lucide-react';

export interface DateRangeValue {
  from: string;
  to: string;
}

export interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: DateRangeValue) => void;
  label?: string;
  className?: string;
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  label,
  className = '',
}: DateRangeFilterProps) {
  const hasSelection = Boolean(from || to);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ from: e.target.value, to });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ from, to: e.target.value });
  };

  const handleClear = () => {
    onChange({ from: '', to: '' });
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <span className="block text-xs font-medium text-slate-700 tracking-tight">
          {label}
        </span>
      )}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 min-h-[40px] py-1 focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-600 transition-colors">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={handleFromChange}
          aria-label="Start date"
          className="text-xs font-mono tabular-nums text-slate-700 bg-transparent focus:outline-none cursor-pointer"
        />
        <span className="text-xs text-slate-400 select-none" aria-hidden="true">
          to
        </span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={handleToChange}
          aria-label="End date"
          className="text-xs font-mono tabular-nums text-slate-700 bg-transparent focus:outline-none cursor-pointer"
        />
        {hasSelection && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear date range"
            className="ml-auto p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
