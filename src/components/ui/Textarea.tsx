'use client';

import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  containerClassName?: string;
  error?: string;
  autoResize?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-[16px] md:text-xs px-3 py-2 md:px-2.5 md:py-1.5 min-h-[38px] md:min-h-[32px]',
  md: 'text-[16px] md:text-xs px-3.5 py-2.5 md:px-3 md:py-2 min-h-[44px] md:min-h-[36px]',
  lg: 'text-[16px] md:text-sm px-4 py-3 md:px-3.5 md:py-2.5 min-h-[48px] md:min-h-[40px]',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  required,
  containerClassName = 'w-full',
  error,
  autoResize = true,
  inputSize = 'md',
  className = '',
  disabled,
  rows = 1,
  value,
  onChange,
  ...props
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  const adjustHeight = () => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
    adjustHeight();
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
        <textarea
          ref={innerRef}
          disabled={disabled}
          rows={rows}
          value={value}
          onChange={handleChange}
          className={`w-full rounded-lg md:rounded-md border border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 transition-colors shadow-xs resize-none overflow-hidden ${
            sizeClasses[inputSize]
          } ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
          } ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : ''
          } ${className}`}
          {...props}
        />
      </div>

      {error && <p className="mt-1.5 md:mt-1 text-xs md:text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
