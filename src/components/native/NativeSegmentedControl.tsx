import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

interface Segment {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface NativeSegmentedControlProps {
  segments: Segment[];
  selectedId: string;
  onChange: (id: string) => void;
  size?: 'small' | 'default' | 'large';
  fullWidth?: boolean;
  className?: string;
}

/**
 * iOS-style UISegmentedControl with animated selection indicator.
 */
export const NativeSegmentedControl = ({
  segments,
  selectedId,
  onChange,
  size = 'default',
  fullWidth = false,
  className,
}: NativeSegmentedControlProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  // Update indicator position on selection change
  useEffect(() => {
    if (!containerRef.current) return;

    const selectedIndex = segments.findIndex(s => s.id === selectedId);
    if (selectedIndex === -1) return;

    const buttons = containerRef.current.querySelectorAll('button');
    const selectedButton = buttons[selectedIndex];
    if (!selectedButton) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();

    setIndicatorStyle({
      width: buttonRect.width - 4,
      transform: `translateX(${buttonRect.left - containerRect.left + 2}px)`,
    });
  }, [selectedId, segments]);

  const handleSelect = async (id: string) => {
    if (id === selectedId) return;
    await hapticService.light();
    onChange(id);
  };

  const sizeClasses = {
    small: 'h-7 text-[13px]',
    default: 'h-8 text-[13px]',
    large: 'h-9 text-[15px]',
  };

  const paddingClasses = {
    small: 'px-2',
    default: 'px-3',
    large: 'px-4',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center rounded-lg',
        'bg-white/10',
        'p-[2px]',
        fullWidth && 'w-full',
        sizeClasses[size],
        className,
      )}
    >
      {/* Animated selection indicator */}
      <div
        className="absolute top-[2px] bottom-[2px] bg-white/20 rounded-md shadow-sm transition-transform duration-200 ease-out"
        style={indicatorStyle}
      />

      {/* Segment buttons */}
      {segments.map(segment => (
        <button
          key={segment.id}
          onClick={() => handleSelect(segment.id)}
          className={cn(
            'relative z-10 flex items-center justify-center gap-1.5 font-medium',
            'transition-colors duration-150',
            paddingClasses[size],
            fullWidth && 'flex-1',
            segment.id === selectedId ? 'text-white' : 'text-white/60',
          )}
        >
          {segment.icon && <span className="flex-shrink-0">{segment.icon}</span>}
          <span>{segment.label}</span>
        </button>
      ))}
    </div>
  );
};

// Pill-style variant (like iOS 15+ design)
interface NativePillSegmentProps {
  segments: Segment[];
  selectedId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const NativePillSegment = ({
  segments,
  selectedId,
  onChange,
  className,
}: NativePillSegmentProps) => {
  const handleSelect = async (id: string) => {
    if (id === selectedId) return;
    await hapticService.light();
    onChange(id);
  };

  return (
    <div className={cn('flex gap-2', className)}>
      {segments.map(segment => (
        <button
          key={segment.id}
          onClick={() => handleSelect(segment.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full',
            'text-[15px] font-medium',
            'transition-all duration-200',
            'active:scale-95',
            segment.id === selectedId
              ? 'bg-primary text-white shadow-lg'
              : 'bg-white/10 text-white/70',
          )}
        >
          {segment.icon && <span className="flex-shrink-0">{segment.icon}</span>}
          <span>{segment.label}</span>
        </button>
      ))}
    </div>
  );
};
