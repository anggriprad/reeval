import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  required?: boolean;
  prefix?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
  error?: string;
}

const heightClasses = {
  sm: 'h-8 text-xs',
  md: 'h-9 text-xs',
  lg: 'h-10 text-sm',
};

const paddingClasses = {
  sm: 'px-2.5',
  md: 'px-3',
  lg: 'px-3.5',
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

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  required,
  prefix,
  inputSize = 'md',
  icon: Icon,
  containerClassName = 'w-full',
  error,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}

      {prefix ? (
        <div
          className={`flex items-center rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-colors shadow-xs ${
            heightClasses[inputSize]
          } ${error ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''
          }`}
        >
          <span className={`h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold border-r border-slate-200 dark:border-slate-600 select-none shrink-0 ${paddingClasses[inputSize]}`}>
            {prefix}
          </span>
          <div className="relative flex-1 h-full">
            {Icon && (
              <Icon className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizes[inputSize]}`} />
            )}
            <input
              ref={ref}
              disabled={disabled}
              className={`w-full h-full bg-transparent font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white ${paddingClasses[inputSize]} ${
                Icon ? iconPadding[inputSize] : ''
              } ${className}`}
              {...props}
            />
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          {Icon && (
            <Icon className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizes[inputSize]}`} />
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full rounded-md border border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 transition-colors shadow-xs ${
              heightClasses[inputSize]
            } ${paddingClasses[inputSize]} ${Icon ? iconPadding[inputSize] : ''} ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''} ${className}`}
            {...props}
          />
        </div>
      )}

      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
