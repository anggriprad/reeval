'use client';

import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  showStatusBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  color?: 'indigo' | 'emerald';
  className?: string;
  id?: string;
  title?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  showStatusBadge = false,
  size = 'md',
  disabled = false,
  color = 'indigo',
  className = '',
  id,
  title,
}) => {
  const sizeClasses = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-3.5 w-3.5',
      translate: 'translate-x-4',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'h-7 w-14',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7',
    },
  };

  const activeBg = color === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600';
  const focusRing = color === 'emerald' ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        title={title || (checked ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan')}
        className={`relative inline-flex ${sizeClasses[size].track} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${focusRing} ${
          checked ? activeBg : 'bg-slate-300 dark:bg-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block ${sizeClasses[size].thumb} transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? sizeClasses[size].translate : 'translate-x-0'
          }`}
        />
      </button>

      {showStatusBadge && (
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
            checked
              ? color === 'emerald'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {checked ? 'ON' : 'OFF'}
        </span>
      )}
    </div>
  );
};
