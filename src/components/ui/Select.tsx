import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
  options?: SelectOption[];
  placeholder?: string;
  error?: string;
}

const sizeClasses = {
  sm: 'pl-2.5 pr-7 py-1 text-xs h-8',
  md: 'pl-3 pr-8 py-1.5 text-xs h-9',
  lg: 'pl-3.5 pr-9 py-2 text-sm h-10',
};

const iconPadding = {
  sm: 'pl-8',
  md: 'pl-9',
  lg: 'pl-10',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5 left-2.5',
  md: 'h-4 w-4 left-3',
  lg: 'h-4 w-4 left-3.5',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  inputSize = 'md',
  icon: Icon,
  containerClassName = 'w-full',
  options = [],
  placeholder,
  error,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  return (
    <div className={`relative ${containerClassName}`}>
      {Icon && (
        <Icon className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizes[inputSize]}`} />
      )}
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full appearance-none rounded-md border border-slate-200 bg-white font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 cursor-pointer transition-colors shadow-xs ${
          sizeClasses[inputSize]
        } ${Icon ? iconPadding[inputSize] : ''} ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.length > 0
          ? options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
