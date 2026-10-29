'use client';

import React from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';

interface ResetConfigButtonProps {
  onReset: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ResetConfigButton({
  onReset,
  disabled = false,
  isLoading = false,
}: ResetConfigButtonProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onReset}
        disabled={disabled || isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        Reset Ke Default
      </button>
    </div>
  );
}
