import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip, InfoIcon } from './Tooltip';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  tooltip?: string;
  disabled?: boolean;
  variant?: 'dark' | 'light';
}

export function Dropdown({ label, value, onChange, options, tooltip, disabled = false, variant = 'light' }: DropdownProps) {
  const isDark = variant === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const hasOptions = options.length > 0;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0];
  const displayLabel = selectedOption?.label ?? (hasOptions ? 'Select an option' : 'No options');

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const menuHeight = menuRef.current?.offsetHeight ?? 0;

      let top = rect.bottom + 8;
      let left = rect.left;
      const width = rect.width;

      if (top + menuHeight > viewportHeight - 8 && rect.top - menuHeight - 8 > 8) {
        top = rect.top - menuHeight - 8;
      }

      if (left + width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - width - 8);
      }

      setMenuStyle({
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 9999,
      });
    };

    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, options.length, value]);

  const handleToggle = () => {
    if (disabled) return;
    if (!hasOptions) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!hasOptions) return;

    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[highlightedIndex];
      if (option) {
        handleSelect(option);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
        isDark ? 'text-white/60' : 'text-void/60'
      }`}>
        {label}
        {tooltip && (
          <Tooltip content={tooltip} position="top">
            <InfoIcon className={isDark ? 'text-white/40 hover:text-white/60' : 'text-void/40 hover:text-void/60'} />
          </Tooltip>
        )}
      </label>
      <div className={`relative group ${isOpen ? 'z-40' : ''}`}>
        <button
          type="button"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          ref={triggerRef}
          className={`
            w-full px-4 py-3 pr-10 text-left
            border-2 rounded-xl
            font-body text-sm
            shadow-[0_1px_0_0_rgba(15,15,15,0.12)]
            transition-[border-color,box-shadow,background-color,transform] duration-200
            focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-genz-yellow/40 focus:ring-offset-2
            hover:shadow-[0_2px_0_0_rgba(15,15,15,0.18)]
            focus:shadow-[0_3px_0_0_rgba(15,15,15,0.22)]
            active:translate-y-[1px]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isDark
              ? 'bg-white/10 text-white border-white/15 shadow-[0_1px_0_0_rgba(255,255,255,0.08)] focus:border-genz-yellow focus:ring-offset-void focus:bg-white/15 enabled:hover:border-white/40'
              : 'bg-white text-void border-void/20 focus:border-void focus:ring-offset-bone focus:bg-bone enabled:hover:border-void/40'
            }
            ${isOpen ? 'ring-2 ring-genz-yellow/20' : ''}
          `}
        >
          <span className="block truncate">{displayLabel}</span>
        </button>
        <div
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
            isDark
              ? 'text-white/50 group-focus-within:text-white/80'
              : 'text-void/50 group-focus-within:text-void/80'
          } ${isOpen ? `-rotate-180 ${isDark ? 'text-white/80' : 'text-void/80'}` : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {isOpen && createPortal(
          <div
            role="listbox"
            ref={menuRef}
            style={menuStyle}
            className={`
              rounded-xl border-2 shadow-[6px_6px_0_0_rgba(15,15,15,0.12)]
              p-2 max-h-60 overflow-auto animate-in
              ${isDark
                ? 'bg-[#111111] border-white/10 text-white'
                : 'bg-white border-void/20 text-void'
              }
            `}
          >
            {hasOptions ? (
              options.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-body transition-[background-color,transform,box-shadow] duration-150 ease-out
                    ${isDark
                      ? 'hover:bg-white/10'
                      : 'hover:bg-light-gray'
                    }
                    ${isHighlighted ? (isDark ? 'bg-white/10' : 'bg-light-gray') : ''}
                    ${isSelected ? (isDark ? 'bg-genz-yellow/20 text-genz-yellow' : 'bg-genz-yellow text-void') : ''}
                    ${isSelected
                      ? 'shadow-none translate-x-0'
                      : (isDark
                        ? 'hover:translate-x-[2px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.45)]'
                        : 'hover:translate-x-[2px] hover:shadow-[2px_2px_0_0_rgba(15,15,15,0.08)]'
                      )
                    }
                  `}
                >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{option.label}</span>
                      {isSelected && <span className="text-xs font-bold" aria-hidden="true">&#10003;</span>}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className={`px-3 py-2 text-xs ${isDark ? 'text-white/50' : 'text-void/50'}`}>
                No options available
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
