import React, { useRef, useState, useCallback } from 'react';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

interface NativeLargeTitleProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: React.ReactNode;
  onMorePress?: () => void;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * iOS-style Large Title navigation with collapsible header.
 * Mimics UINavigationController's large title behavior.
 */
export const NativeLargeTitle = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  rightAction,
  onMorePress,
  searchPlaceholder,
  onSearchChange,
  children,
  className,
}: NativeLargeTitleProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Track scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollY(target.scrollTop);
  }, []);

  // Calculate header collapse progress (0 = expanded, 1 = collapsed)
  const collapseProgress = Math.min(scrollY / 60, 1);

  // Large title opacity (fades as it scrolls up)
  const largeTitleOpacity = Math.max(0, 1 - collapseProgress * 2);
  const largeTitleTransform = `translateY(${-collapseProgress * 20}px) scale(${1 - collapseProgress * 0.15})`;

  // Inline title opacity (appears as large title fades)
  const inlineTitleOpacity = Math.max(0, (collapseProgress - 0.3) / 0.7);

  const handleBack = async () => {
    if (!onBack) return;
    await hapticService.light();
    onBack();
  };

  const handleMore = async () => {
    if (!onMorePress) return;
    await hapticService.light();
    onMorePress();
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  return (
    <div className={cn('flex flex-col h-full bg-black', className)}>
      {/* Fixed Navigation Bar */}
      <div
        className="sticky top-0 z-20 backdrop-blur-xl"
        style={{
          backgroundColor: `rgba(28, 28, 30, ${collapseProgress * 0.95})`,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {/* Standard nav bar height (44pt) */}
        <div className="h-11 flex items-center px-4 relative">
          {/* Back button */}
          {onBack && (
            <button
              onClick={handleBack}
              className="flex items-center gap-0.5 text-primary active:opacity-50 -ml-1"
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
              <span className="text-[17px]">{backLabel}</span>
            </button>
          )}

          {/* Inline title (appears on collapse) */}
          <div
            className="absolute inset-x-0 flex justify-center pointer-events-none"
            style={{ opacity: inlineTitleOpacity }}
          >
            <h1 className="text-[17px] font-semibold text-white truncate max-w-[60%]">{title}</h1>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {rightAction}
            {onMorePress && (
              <button
                onClick={handleMore}
                className="w-8 h-8 flex items-center justify-center text-primary active:opacity-50"
              >
                <MoreHorizontal size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Border that appears on collapse */}
        <div
          className="h-px bg-white/10 transition-opacity"
          style={{ opacity: collapseProgress }}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Large title section */}
        <div className="px-4 pt-1 pb-2">
          <h1
            className="text-[34px] font-bold text-white leading-tight origin-left"
            style={{
              opacity: largeTitleOpacity,
              transform: largeTitleTransform,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-white/60 mt-1" style={{ opacity: largeTitleOpacity }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Search bar (if enabled) */}
        {onSearchChange && (
          <div className="px-4 pb-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder={searchPlaceholder || 'Search'}
                className={cn(
                  'w-full h-9 pl-9 pr-4 rounded-lg',
                  'bg-white/10 text-white placeholder-white/40',
                  'text-[17px] outline-none',
                  'focus:bg-white/15 transition-colors',
                )}
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="pb-safe-area-bottom">{children}</div>
      </div>
    </div>
  );
};

// Compact header variant (no large title)
interface NativeCompactHeaderProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export const NativeCompactHeader = ({
  title,
  onBack,
  backLabel = 'Back',
  rightAction,
  transparent = false,
  className,
}: NativeCompactHeaderProps) => {
  const handleBack = async () => {
    if (!onBack) return;
    await hapticService.light();
    onBack();
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-20',
        !transparent && 'bg-[#1c1c1e]/95 backdrop-blur-xl border-b border-white/10',
        className,
      )}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="h-11 flex items-center px-4 relative">
        {/* Back button */}
        {onBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-0.5 text-primary active:opacity-50 -ml-1"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
            <span className="text-[17px]">{backLabel}</span>
          </button>
        )}

        {/* Title */}
        <div className="absolute inset-x-16 flex justify-center">
          <h1 className="text-[17px] font-semibold text-white truncate">{title}</h1>
        </div>

        {/* Right actions */}
        {rightAction && <div className="ml-auto">{rightAction}</div>}
      </div>
    </div>
  );
};
