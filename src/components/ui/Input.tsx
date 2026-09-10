import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
  error?: string;
}

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs h-8',
  md: 'px-3 py-1.5 text-xs h-9',
  lg: 'px-3.5 py-2 text-sm h-10',
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
  inputSize = 'md',
  icon: Icon,
  containerClassName = 'w-full',
  error,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <div className={`relative ${containerClassName}`}>
      {Icon && (
        <Icon className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizes[inputSize]}`} />
      )}
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-md border border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 transition-colors shadow-xs ${
          sizeClasses[inputSize]
        } ${Icon ? iconPadding[inputSize] : ''} ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
