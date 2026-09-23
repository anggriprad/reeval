import React, { forwardRef, useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'onChange'> {
  label?: string;
  required?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
  options?: SelectOption[];
  placeholder?: string;
  error?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  align?: 'left' | 'right';
  activeHighlight?: boolean;
  direction?: 'auto' | 'up' | 'down';
}

const heightClasses = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-9 text-xs px-3',
  lg: 'h-10 text-sm px-3.5',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  required,
  inputSize = 'md',
  icon: Icon,
  containerClassName = 'w-full',
  options = [],
  placeholder,
  error,
  className = '',
  disabled,
  children,
  value,
  defaultValue,
  onChange,
  onValueChange,
  align = 'left',
  activeHighlight,
  direction = 'auto',
  name,
  ...props
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [internalValue, setInternalValue] = useState<string>(
    value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ''
  );

  const currentValue = value !== undefined ? String(value) : internalValue;

  const calcPosition = useCallback(() => {
    if (direction === 'up') {
      setOpenUpward(true);
      return;
    }
    if (direction === 'down') {
      setOpenUpward(false);
      return;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownMaxHeight = 245;

      if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [direction]);

  // Synchronous layout effect before browser paint to prevent flicker
  useLayoutEffect(() => {
    if (!isOpen) return;

    calcPosition();

    const handleScrollOrResize = () => {
      calcPosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, calcPosition]);

  // Extract options from options prop or React children <option> elements
  const parsedOptions: SelectOption[] = useMemo(() => {
    if (options && options.length > 0) {
      return options;
    }
    const res: SelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const val = (child.props as any).value ?? '';
        const lbl = (child.props as any).children ?? String(val);
        const dis = (child.props as any).disabled;
        res.push({ value: val, label: typeof lbl === 'string' ? lbl : String(lbl), disabled: dis });
      }
    });
    return res;
  }, [options, children]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Auto scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  const toggleOpen = () => {
    if (disabled) return;
    const nextOpen = !isOpen;
    if (nextOpen) {
      calcPosition();
      const initialIdx = parsedOptions.findIndex(o => String(o.value) === currentValue);
      setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
    }
    setIsOpen(nextOpen);
  };

  const handleSelect = (val: string | number) => {
    if (disabled) return;
    const strVal = String(val);
    setInternalValue(strVal);
    setIsOpen(false);

    if (onChange) {
      onChange({
        target: {
          value: strVal,
          name,
        },
      } as any);
    }
    if (onValueChange) {
      onValueChange(strVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        calcPosition();
        setIsOpen(true);
        const initialIdx = parsedOptions.findIndex(o => String(o.value) === currentValue);
        setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
      } else {
        setFocusedIndex(prev => {
          let next = prev + 1;
          while (next < parsedOptions.length && parsedOptions[next].disabled) {
            next++;
          }
          return next < parsedOptions.length ? next : prev;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        calcPosition();
        setIsOpen(true);
        const initialIdx = parsedOptions.findIndex(o => String(o.value) === currentValue);
        setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
      } else {
        setFocusedIndex(prev => {
          let next = prev - 1;
          while (next >= 0 && parsedOptions[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (isOpen) {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < parsedOptions.length) {
          const opt = parsedOptions[focusedIndex];
          if (!opt.disabled) {
            handleSelect(opt.value);
          }
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  const selectedOpt = parsedOptions.find(opt => String(opt.value) === currentValue);
  const displayLabel = selectedOpt
    ? selectedOpt.label
    : placeholder || (parsedOptions.length > 0 ? parsedOptions[0].label : '');

  const isHighlighted = activeHighlight && currentValue !== '' && currentValue !== 'ALL';

  const realOptions = useMemo(() => {
    if (parsedOptions.length === 0) return [];
    if (
      parsedOptions.length === 1 &&
      String(parsedOptions[0].value) === '' &&
      (Boolean(placeholder) || parsedOptions[0].label.toLowerCase().includes('pilih') || parsedOptions[0].label.startsWith('--'))
    ) {
      return [];
    }
    return parsedOptions;
  }, [parsedOptions, placeholder]);

  return (
    <div className={`w-full ${containerClassName}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}

      {/* Relative wrapper specifically around button and popover */}
      <div className="relative w-full">
        {/* Hidden native select for form integration & ref */}
        <select
          ref={ref}
          name={name}
          value={currentValue}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {parsedOptions.map(opt => (
            <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Dropdown Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggleOpen}
          className={`w-full inline-flex items-center justify-between gap-2 rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
            heightClasses[inputSize]
          } ${
            isHighlighted
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-600'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
          } ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850' : 'cursor-pointer'
          } ${className}`}
        >
          <span className="inline-flex items-center gap-2 truncate">
            {Icon && <Icon className={`text-slate-400 shrink-0 ${iconSizes[inputSize]}`} />}
            <span className="truncate">{displayLabel}</span>
          </span>
          <ChevronDown className={`shrink-0 text-slate-400 transition-transform duration-200 ${iconSizes[inputSize]} ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Popover Dropdown Menu (Auto opens upward or downward) */}
        {isOpen && (
          <div
            className={`absolute z-50 min-w-full w-max max-w-[320px] rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 p-1 max-h-60 overflow-y-auto ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {parsedOptions.length === 0 ? (
              <div className="px-3.5 py-2.5 text-xs font-medium text-slate-400 dark:text-slate-500 text-center italic">
                tidak ada opsi ditemukan
              </div>
            ) : (
              <>
                {parsedOptions.map((opt, index) => {
                  const isSelected = String(opt.value) === currentValue;
                  const isFocused = index === focusedIndex;
                  return (
                    <button
                      key={String(opt.value)}
                      ref={el => { optionRefs.current[index] = el; }}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`w-full text-left text-xs rounded-md px-3 py-2 font-medium flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold'
                          : isFocused
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
                {realOptions.length === 0 && (
                  <div className="px-3.5 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 text-center italic border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                    tidak ada opsi ditemukan
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
