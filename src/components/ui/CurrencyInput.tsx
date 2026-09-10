import React, { useState, useEffect, forwardRef } from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  value: number | string;
  onChange: (val: number | '') => void;
  inputSize?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
  prefix?: string;
  error?: string;
}

const sizeClasses = {
  sm: 'pl-8 pr-2.5 py-1 text-xs h-8',
  md: 'pl-9 pr-3 py-1.5 text-xs h-9',
  lg: 'pl-10 pr-3.5 py-2 text-sm h-10',
};

const prefixSizes = {
  sm: 'left-2.5 text-xs',
  md: 'left-3 text-xs',
  lg: 'left-3.5 text-sm',
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(({
  value,
  onChange,
  inputSize = 'md',
  containerClassName = 'w-full',
  prefix = 'Rp',
  className = '',
  disabled,
  error,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === undefined || value === null || Number.isNaN(value)) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setDisplayValue('');
      onChange('');
    } else {
      const numValue = parseInt(rawValue, 10);
      setDisplayValue(numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      onChange(numValue);
    }
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {prefix && (
        <span className={`absolute top-1/2 -translate-y-1/2 font-bold text-slate-400 select-none pointer-events-none ${prefixSizes[inputSize]}`}>
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full rounded-md border border-slate-200 bg-white font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 transition-colors shadow-xs ${
          sizeClasses[inputSize]
        } ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

CurrencyInput.displayName = 'CurrencyInput';
