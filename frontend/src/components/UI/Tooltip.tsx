import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [actualPosition, setActualPosition] = useState<TooltipPosition>(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Estimate tooltip dimensions (will be refined after render)
      const tooltipWidth = tooltipRef.current?.offsetWidth || 200;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 40;

      let newPosition = position;
      let top = 0;
      let left = 0;

      // Check if tooltip would overflow and adjust position
      if (position === 'top' && triggerRect.top - tooltipHeight - 8 < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && triggerRect.bottom + tooltipHeight + 8 > viewportHeight - 10) {
        newPosition = 'top';
      } else if (position === 'left' && triggerRect.left - tooltipWidth - 8 < 10) {
        newPosition = 'right';
      } else if (position === 'right' && triggerRect.right + tooltipWidth + 8 > viewportWidth - 10) {
        newPosition = 'left';
      }

      // Calculate position based on actual position
      switch (newPosition) {
        case 'top':
          top = triggerRect.top - tooltipHeight - 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
          left = triggerRect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
          left = triggerRect.right + 8;
          break;
      }

      // Clamp to viewport bounds
      left = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));
      top = Math.max(10, Math.min(top, viewportHeight - tooltipHeight - 10));

      setActualPosition(newPosition);
      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 99999,
      });

      // Calculate arrow position
      const arrowTop = newPosition === 'top' ? 'auto' : newPosition === 'bottom' ? '-4px' : '50%';
      const arrowBottom = newPosition === 'top' ? '-4px' : 'auto';
      const arrowLeft = newPosition === 'left' ? 'auto' : newPosition === 'right' ? '-4px' : '50%';
      const arrowRight = newPosition === 'left' ? '-4px' : 'auto';
      const arrowTransform = (newPosition === 'top' || newPosition === 'bottom')
        ? 'translateX(-50%)'
        : 'translateY(-50%)';

      setArrowStyle({
        position: 'absolute',
        top: arrowTop,
        bottom: arrowBottom,
        left: arrowLeft,
        right: arrowRight,
        transform: arrowTransform,
      });
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getArrowClasses = (): string => {
    const baseStyles = 'w-0 h-0 border-solid';

    const arrowStyles: Record<TooltipPosition, string> = {
      top: 'border-t-[#0F0F0F] border-t-4 border-x-transparent border-x-4 border-b-0',
      bottom: 'border-b-[#0F0F0F] border-b-4 border-x-transparent border-x-4 border-t-0',
      left: 'border-l-[#0F0F0F] border-l-4 border-y-transparent border-y-4 border-r-0',
      right: 'border-r-[#0F0F0F] border-r-4 border-y-transparent border-y-4 border-l-0',
    };

    return `${baseStyles} ${arrowStyles[actualPosition]}`;
  };

  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      className="px-3 py-2 text-xs font-body bg-[#0F0F0F] text-white rounded-lg shadow-lg max-w-xs pointer-events-none"
    >
      <span className="whitespace-normal break-words">{content}</span>
      <span className={getArrowClasses()} style={arrowStyle} />
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </div>
  );
}

// Info icon component for use with tooltips
export function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-4 h-4 ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}
