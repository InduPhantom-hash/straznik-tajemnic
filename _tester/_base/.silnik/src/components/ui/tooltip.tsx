"use client";

import type { ReactNode } from 'react';
import { useRef, useEffect, useState } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

export function Tooltip({ content, children, position = 'top', maxWidth = '300px' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [smartPosition, setSmartPosition] = useState(position);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smart positioning - check if tooltip would overflow and adjust
  useEffect(() => {
    if (isVisible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // If element is in the left 25% of screen, position tooltip to the right
      if (rect.left < viewportWidth * 0.25 && (position === 'left' || position === 'top')) {
        setSmartPosition('right');
      }
      // If element is in the right 25% of screen, position tooltip to the left
      else if (rect.right > viewportWidth * 0.75 && (position === 'right' || position === 'top')) {
        setSmartPosition('left');
      } else {
        setSmartPosition(position);
      }
    }
  }, [isVisible, position]);

  const getPositionClasses = () => {
    switch (smartPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (smartPosition) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-border';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-border';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-border';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-border';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-border';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative inline-block overflow-visible"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-[100] ${getPositionClasses()}`}>
          <div 
            className="bg-card border border-border rounded-md p-3 shadow-lg text-sm text-foreground whitespace-normal"
            style={{ maxWidth, minWidth: '200px' }}
          >
            {content}
          </div>
          <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}></div>
        </div>
      )}
    </div>
  );
}

interface HelpIconProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpIcon({ content, position = 'top' }: HelpIconProps) {
  return (
    <Tooltip content={content} position={position}>
      <span className="inline-flex items-center justify-center w-5 h-5 ml-2 text-primary/60 hover:text-primary cursor-help transition-colors duration-200">
        ?
      </span>
    </Tooltip>
  );
}