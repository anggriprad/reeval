import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  required?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
  error?: string;
}

const heightClasses = {
  sm: 'h-10 md:h-8 text-[16px] md:text-xs',
  md: 'h-11 md:h-9 text-[16px] md:text-sm',
  lg: 'h-12 md:h-10 text-[16px] md:text-base',
};

const paddingClasses = {
  sm: 'px-3 md:px-2.5',
  md: 'px-3.5 md:px-3',
  lg: 'px-4 md:px-3.5',
};

const iconPadding = {
  sm: 'pl-8 pr-3 md:pl-8 md:pr-2.5',
  md: 'pl-9 pr-3.5 md:pl-9 md:pr-3',
  lg: 'pl-10 pr-4 md:pl-10 md:pr-3.5',
};

const iconSizes = {
  sm: 'h-4 w-4 md:h-3.5 md:w-3.5 left-2.5',
  md: 'h-4 w-4 left-3',
  lg: 'h-4.5 w-4.5 md:h-4 md:w-4 left-3.5',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  required,
  prefix,
  suffix,
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
        <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}

      {prefix || suffix ? (
        <div
          className={`flex items-center rounded-lg md:rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-colors shadow-xs ${heightClasses[inputSize]
            } ${error ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20' : ''} ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''
            }`}
        >
          {prefix && (
            <span className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-sm md:text-xs font-normal border-r border-slate-200 dark:border-slate-600 select-none shrink-0 px-3 md:px-3">
              {prefix}
            </span>
          )}
          <div className="relative flex-1 h-full min-w-0">
            {Icon && (
              <Icon className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizes[inputSize]}`} />
            )}
            <input
              ref={ref}
              disabled={disabled}
              className={`w-full h-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white ${Icon ? iconPadding[inputSize] : paddingClasses[inputSize]
                } ${className}`}
              {...props}
            />
          </div>
          {suffix && (
            <span className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm md:text-xs font-medium border-l border-slate-200 dark:border-slate-600 select-none shrink-0 px-3 md:px-2.5">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <div className="relative w-full">
          {Icon && (
            <Icon className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizes[inputSize]}`} />
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full rounded-lg md:rounded-md border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 transition-colors shadow-xs ${heightClasses[inputSize]
              } ${Icon ? iconPadding[inputSize] : paddingClasses[inputSize]} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''} ${className}`}
            {...props}
          />
        </div>
      )}

      {error && <p className="mt-1.5 md:mt-1 text-xs md:text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
