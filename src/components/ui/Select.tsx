'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  onNativeChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      error,
      value,
      onChange,
      onNativeChange,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onNativeChange) {
        onNativeChange(e);
      }
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-slate-700 tracking-tight"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={handleChange}
            className={`w-full min-h-[40px] appearance-none pl-3.5 pr-9 py-2 text-sm bg-white border rounded-lg text-slate-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer ${
              error
                ? 'border-red-500 focus:border-red-600 focus:ring-red-600/20'
                : 'border-slate-300'
            }`}
            aria-invalid={Boolean(error)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export const SelectFilter = Select;
