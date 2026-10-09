'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TruncatedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  maxWidth?: string | number;
  className?: string;
}

/**
 * Reusable component for displaying single-line text with ellipsis overflow.
 * Dynamically computes and shows the `title` tooltip ONLY if the text actually overflows.
 */
export function TruncatedText({ text, maxWidth, className, ...props }: TruncatedTextProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    // Check if text is truncated / overflowing
    if (el.scrollWidth > el.clientWidth) {
      el.title = text;
    } else {
      el.removeAttribute('title');
    }
  };

  return (
    <span
      {...props}
      onMouseEnter={handleMouseEnter}
      className={cn('truncate inline-block max-w-full align-bottom', className)}
      style={maxWidth !== undefined ? { maxWidth, ...props.style } : props.style}
    >
      {text}
    </span>
  );
}

TruncatedText.displayName = 'TruncatedText';
