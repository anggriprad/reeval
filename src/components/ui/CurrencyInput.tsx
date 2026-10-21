import React, { useState, useEffect, forwardRef } from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  label?: string;
  required?: boolean;
  value: number | string;
  onChange: (val: number | '') => void;
  inputSize?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
  prefix?: string;
  error?: string;
}

const sizeClasses = {
  sm: 'pl-8 pr-3 py-1.5 md:py-1 text-[16px] md:text-xs h-10 md:h-8',
  md: 'pl-9 pr-3.5 py-2 md:py-1.5 text-[16px] md:text-xs h-11 md:h-9',
  lg: 'pl-10 pr-4 py-2.5 md:py-2 text-[16px] md:text-sm h-12 md:h-10',
};

const prefixSizes = {
  sm: 'left-2.5 text-sm md:text-xs',
  md: 'left-3 text-sm md:text-xs',
  lg: 'left-3.5 text-base md:text-sm',
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(({
  label,
  required,
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
    <div className={containerClassName}>
      {label && (
        <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}
      <div className="relative w-full">
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
          className={`w-full rounded-lg md:rounded-md border border-slate-200 bg-white font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 transition-colors shadow-xs ${
            sizeClasses[inputSize]
          } ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 md:mt-1 text-xs md:text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

CurrencyInput.displayName = 'CurrencyInput';
