import React, { useCallback } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { usePullToRefreshContainer } from '../../hooks/usePullToRefreshContainer';
import { useIsMobile } from '../../hooks/use-mobile';

interface PullToRefreshContainerProps {
  /** Content to render inside the container */
  children: React.ReactNode;
  /** Async function called when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean;
  /** Additional class name for the container */
  className?: string;
}

/**
 * Native-style pull-to-refresh container component.
 *
 * Features:
 * - iOS/Android native-feeling pull gesture
 * - Animated refresh indicator with rotation
 * - Haptic feedback at threshold and completion
 * - Works consistently across iOS Safari, iOS PWA, Android Chrome, Android PWA
 * - Desktop: disabled, renders children only
 */
export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  children,
  onRefresh,
  disabled = false,
  className = '',
}) => {
  const isMobile = useIsMobile();

  // Detect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      : false;

  const { containerRef, handlers, state, getIndicatorStyle, getContentStyle, threshold } =
    usePullToRefreshContainer({
      onRefresh,
      disabled: disabled || !isMobile,
    });

  // Get spinner rotation based on pull progress and refresh state
  const getSpinnerStyle = useCallback((): React.CSSProperties => {
    const { progress, isRefreshing, isPulling } = state;

    if (isRefreshing) {
      return {
        animation: prefersReducedMotion ? 'none' : 'spin 1s linear infinite',
      };
    }

    // Rotate based on pull progress (0 to 360 degrees)
    const rotation = progress * 360;
    return {
      transform: `rotate(${rotation}deg)`,
      transition: isPulling ? 'none' : 'transform 0.3s ease-out',
    };
  }, [state, prefersReducedMotion]);

  // Desktop: render children only
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const { pullDistance, isRefreshing, shouldTrigger, progress } = state;
  const isActive = pullDistance > 0 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        WebkitOverflowScrolling: 'touch',
      }}
      {...handlers}
    >
      {/* Pull indicator - positioned above content */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          top: -threshold,
          height: threshold,
          ...getIndicatorStyle(),
        }}
      >
        <div
          className={`
            flex items-center justify-center rounded-full
            w-10 h-10 bg-background border border-border shadow-lg
            ${shouldTrigger || isRefreshing ? 'border-primary bg-primary/10' : ''}
            transition-colors duration-200
          `}
        >
          {isRefreshing ? (
            // Refreshing state - spinning icon
            <RefreshCw size={20} className="text-primary" style={getSpinnerStyle()} />
          ) : shouldTrigger ? (
            // Ready to refresh - check mark
            <Check size={20} className="text-primary" />
          ) : (
            // Pulling state - rotating arrow
            <RefreshCw
              size={20}
              className={`text-muted-foreground ${progress > 0.5 ? 'text-primary' : ''}`}
              style={getSpinnerStyle()}
            />
          )}
        </div>
      </div>

      {/* Status text */}
      {isActive && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            top: pullDistance - 24,
            opacity: progress,
            transition: state.isPulling ? 'none' : 'opacity 0.3s ease-out',
          }}
        >
          <span className="text-xs text-muted-foreground font-medium">
            {isRefreshing
              ? 'Refreshing...'
              : shouldTrigger
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </div>
      )}

      {/* Content area */}
      <div style={getContentStyle()}>{children}</div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PullToRefreshContainer;
