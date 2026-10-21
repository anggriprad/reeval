import React, { forwardRef, useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

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
  dropdownClassName?: string;
  searchable?: boolean;
  search?: boolean;
  searchPlaceholder?: string;
}

// Helper to recursively extract plain text from React nodes (avoids array join commas)
const extractText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return String(node);
};

const heightClasses = {
  sm: 'h-10 md:h-8 text-[16px] md:text-xs px-3 md:px-2.5',
  md: 'h-11 md:h-9 text-[16px] md:text-xs px-3.5 md:px-3',
  lg: 'h-12 md:h-10 text-[16px] md:text-sm px-4 md:px-3.5',
};

const optionTextClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[16px] md:text-xs px-3.5 md:px-3 py-2.5 md:py-2',
  md: 'text-[16px] md:text-xs px-3.5 md:px-3 py-2.5 md:py-2',
  lg: 'text-[16px] md:text-sm px-4 md:px-3.5 py-3 md:py-2.5',
};

const iconSizes = {
  sm: 'h-4 w-4 md:h-3.5 md:w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4.5 w-4.5 md:h-4 md:w-4',
};

// Helper to check if an option is a default/placeholder option that should display empty
const isDefaultPlaceholderOption = (opt?: SelectOption | null): boolean => {
  if (!opt) return true;
  const valStr = String(opt.value ?? '');
  if (valStr === '') {
    if (opt.disabled) return true;
    const lbl = (opt.label || '').trim();
    if (!lbl || lbl.startsWith('--') || lbl.toLowerCase().includes('pilih')) {
      return true;
    }
  }
  return false;
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
  dropdownClassName,
  name,
  searchable = false,
  search = false,
  searchPlaceholder = 'Cari opsi...',
  ...props
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchable = Boolean(searchable || search);
  const [internalValue, setInternalValue] = useState<string>(
    value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ''
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && isSearchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen, isSearchable]);

  const currentValue = value !== undefined ? String(value) : internalValue;

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownMaxHeight = 245;

    let isUpward = false;
    if (direction === 'up') {
      isUpward = true;
    } else if (direction === 'down') {
      isUpward = false;
    } else {
      isUpward = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;
    }

    setOpenUpward(isUpward);

    const width = Math.min(rect.width, viewportWidth - 16);
    const left = align === 'right'
      ? Math.max(8, rect.right - width)
      : Math.min(Math.max(8, rect.left), viewportWidth - width - 8);

    if (isUpward) {
      setCoords({
        bottom: viewportHeight - rect.top + 6,
        left,
        width,
        openUpward: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        width,
        openUpward: false,
      });
    }
  }, [direction, align]);

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

  // Extract options from options prop or React children <option> elements (including optgroup)
  const parsedOptions: SelectOption[] = useMemo(() => {
    let res: SelectOption[] = [];
    if (options && options.length > 0) {
      res = [...options];
    } else {
      const extractOptions = (nodes: React.ReactNode) => {
        React.Children.forEach(nodes, (child) => {
          if (!React.isValidElement(child)) return;
          if (child.type === 'option') {
            const val = (child.props as any).value ?? '';
            const rawChildren = (child.props as any).children;
            const lbl = rawChildren !== undefined ? extractText(rawChildren) : String(val);
            const dis = (child.props as any).disabled;
            res.push({ value: val, label: lbl, disabled: dis });
          } else if ((child.props as any)?.children) {
            extractOptions((child.props as any).children);
          }
        });
      };
      extractOptions(children);
    }

    // Auto-inject placeholder as selectable option if provided and no empty option already exists
    const hasEmptyOption = res.some(opt => String(opt.value) === '' || String(opt.value).toUpperCase() === 'ALL');
    if (placeholder && !hasEmptyOption) {
      res.unshift({ value: '', label: placeholder });
    }

    return res;
  }, [options, children, placeholder]);

  // Filter out default placeholder options from the dropdown popup
  const selectableOptions = useMemo(() => {
    return parsedOptions.filter(opt => !isDefaultPlaceholderOption(opt));
  }, [parsedOptions]);

  // Filtered options based on search term
  const displayedOptions = useMemo(() => {
    if (!isSearchable || !searchTerm.trim()) return selectableOptions;
    const term = searchTerm.toLowerCase();
    return selectableOptions.filter(opt =>
      opt.label.toLowerCase().includes(term) ||
      (opt.value !== '' && String(opt.value).toLowerCase().includes(term))
    );
  }, [selectableOptions, isSearchable, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
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
      const initialIdx = selectableOptions.findIndex(o => String(o.value) === currentValue);
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
        const initialIdx = selectableOptions.findIndex(o => String(o.value) === currentValue);
        setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
      } else {
        setFocusedIndex(prev => {
          let next = prev + 1;
          while (next < selectableOptions.length && selectableOptions[next].disabled) {
            next++;
          }
          return next < selectableOptions.length ? next : prev;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        calcPosition();
        setIsOpen(true);
        const initialIdx = selectableOptions.findIndex(o => String(o.value) === currentValue);
        setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
      } else {
        setFocusedIndex(prev => {
          let next = prev - 1;
          while (next >= 0 && selectableOptions[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (isOpen) {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < selectableOptions.length) {
          const opt = selectableOptions[focusedIndex];
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
  const displayLabel = useMemo(() => {
    if (!currentValue || currentValue === '') {
      return '';
    }
    if (selectedOpt) {
      if (isDefaultPlaceholderOption(selectedOpt)) {
        return '';
      }
      return selectedOpt.label;
    }
    return '';
  }, [selectedOpt, currentValue]);

  const isHighlighted = activeHighlight && currentValue !== '' && currentValue !== 'ALL';

  return (
    <div className={`w-full ${containerClassName}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
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
          className={`w-full inline-flex items-center justify-between gap-2 rounded-lg md:rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
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
            <span className="truncate">{displayLabel || '\u00A0'}</span>
          </span>
          <ChevronDown className={`shrink-0 text-slate-400 transition-transform duration-200 ${iconSizes[inputSize]} ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Popover Dropdown Menu (Rendered via Portal to completely avoid container overflow clipping) */}
        {isOpen && mounted && coords && createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              ...(coords.openUpward ? { bottom: `${coords.bottom}px` } : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, isSearchable ? 220 : coords.width)}px`,
              zIndex: 9999,
            }}
            className={`rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 flex flex-col max-h-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName || ''}`}
          >
            {isSearchable && (
              <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setFocusedIndex(0);
                    }}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setFocusedIndex(prev => {
                          let next = prev + 1;
                          while (next < displayedOptions.length && displayedOptions[next].disabled) {
                            next++;
                          }
                          return next < displayedOptions.length ? next : prev;
                        });
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setFocusedIndex(prev => {
                          let next = prev - 1;
                          while (next >= 0 && displayedOptions[next].disabled) {
                            next--;
                          }
                          return next >= 0 ? next : prev;
                        });
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (displayedOptions.length > 0 && focusedIndex >= 0 && focusedIndex < displayedOptions.length) {
                          const opt = displayedOptions[focusedIndex];
                          if (!opt.disabled) {
                            handleSelect(opt.value);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsOpen(false);
                      }
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full bg-white dark:bg-slate-800 text-[16px] md:text-xs text-slate-900 dark:text-white rounded-md pl-7 pr-6 py-1.5 md:py-1 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
                      tabIndex={-1}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="p-1 overflow-y-auto flex-1 max-h-56">
              {displayedOptions.length === 0 ? (
                <div className="px-3.5 py-2.5 text-[16px] md:text-xs font-medium text-slate-400 dark:text-slate-500 text-center italic">
                  tidak ada opsi ditemukan
                </div>
              ) : (
                <>
                  {displayedOptions.map((opt, index) => {
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
                        className={`w-full text-left ${optionTextClasses[inputSize] || optionTextClasses.md} rounded-md font-medium flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold'
                            : isFocused
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 md:w-3.5 md:h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                  {!isSearchable && selectableOptions.length === 0 && (
                    <div className="px-3.5 py-2 text-[16px] md:text-xs font-medium text-slate-400 dark:text-slate-500 text-center italic border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      tidak ada opsi ditemukan
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {error && <p className="mt-1.5 md:mt-1 text-xs md:text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
