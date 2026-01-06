import React from 'react';
import {
  Inbox,
  Calendar,
  MessageCircle,
  Image,
  MapPin,
  CheckCircle,
  CreditCard,
  Users,
  Search,
  Wifi,
  AlertCircle,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

interface NativeEmptyStateProps {
  type?:
    | 'trips'
    | 'messages'
    | 'calendar'
    | 'media'
    | 'places'
    | 'tasks'
    | 'payments'
    | 'members'
    | 'search'
    | 'offline'
    | 'error'
    | 'custom';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  className?: string;
}

const PRESET_CONFIGS: Record<
  Exclude<NativeEmptyStateProps['type'], 'custom'>,
  { icon: React.ReactNode; title: string; description: string }
> = {
  trips: {
    icon: <Plane size={48} />,
    title: 'No Trips Yet',
    description: 'Start planning your next adventure by creating your first trip.',
  },
  messages: {
    icon: <MessageCircle size={48} />,
    title: 'No Messages',
    description: 'Start the conversation with your trip group.',
  },
  calendar: {
    icon: <Calendar size={48} />,
    title: 'No Events',
    description: 'Your trip calendar is empty. Add events to keep everyone on schedule.',
  },
  media: {
    icon: <Image size={48} />,
    title: 'No Media',
    description: 'Share photos and videos from your trip with the group.',
  },
  places: {
    icon: <MapPin size={48} />,
    title: 'No Places Saved',
    description: 'Save interesting places you want to visit on your trip.',
  },
  tasks: {
    icon: <CheckCircle size={48} />,
    title: 'No Tasks',
    description: 'Create tasks to organize trip preparations and assignments.',
  },
  payments: {
    icon: <CreditCard size={48} />,
    title: 'No Expenses',
    description: 'Track shared expenses and split costs with your group.',
  },
  members: {
    icon: <Users size={48} />,
    title: 'No Members',
    description: 'Invite friends and family to join your trip.',
  },
  search: {
    icon: <Search size={48} />,
    title: 'No Results',
    description: "Try adjusting your search or filters to find what you're looking for.",
  },
  offline: {
    icon: <Wifi size={48} />,
    title: "You're Offline",
    description: 'Check your internet connection and try again.',
  },
  error: {
    icon: <AlertCircle size={48} />,
    title: 'Something Went Wrong',
    description: "We couldn't load this content. Please try again.",
  },
};

/**
 * iOS-style empty state component.
 * Uses gentle illustrations and clear messaging.
 */
export const NativeEmptyState = ({
  type = 'custom',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  className,
}: NativeEmptyStateProps) => {
  const preset = type !== 'custom' ? PRESET_CONFIGS[type] : null;

  const displayIcon = icon || preset?.icon || <Inbox size={48} />;
  const displayTitle = title || preset?.title || 'Nothing Here';
  const displayDescription = description || preset?.description || "There's nothing to show yet.";

  const handleAction = async () => {
    if (!onAction) return;
    await hapticService.light();
    onAction();
  };

  const handleSecondaryAction = async () => {
    if (!onSecondaryAction) return;
    await hapticService.light();
    onSecondaryAction();
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-6' : 'py-16 px-8',
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-white/5',
          compact ? 'w-16 h-16 mb-4' : 'w-20 h-20 mb-6',
        )}
      >
        <div className="text-white/30">{displayIcon}</div>
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-white',
          compact ? 'text-[17px] mb-1' : 'text-[20px] mb-2',
        )}
      >
        {displayTitle}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-white/50 max-w-[280px] leading-relaxed',
          compact ? 'text-[14px]' : 'text-[15px]',
        )}
      >
        {displayDescription}
      </p>

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className={cn('flex flex-col gap-3 w-full max-w-[240px]', compact ? 'mt-4' : 'mt-6')}>
          {actionLabel && (
            <button
              onClick={handleAction}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-[17px]',
                'bg-primary text-white',
                'active:scale-[0.98] transition-transform',
              )}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && (
            <button
              onClick={handleSecondaryAction}
              className={cn(
                'w-full py-3 rounded-xl font-medium text-[17px]',
                'text-primary',
                'active:opacity-50 transition-opacity',
              )}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Skeleton loading state
interface NativeLoadingStateProps {
  rows?: number;
  showHeader?: boolean;
  className?: string;
}

export const NativeLoadingState = ({
  rows = 3,
  showHeader = true,
  className,
}: NativeLoadingStateProps) => {
  return (
    <div className={cn('p-4 space-y-4', className)}>
      {showHeader && <div className="h-8 w-1/3 bg-white/10 rounded-lg animate-pulse" />}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded-lg animate-pulse w-3/4" />
            <div className="h-3 bg-white/5 rounded-lg animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Pull to refresh indicator
interface NativePullIndicatorProps {
  isRefreshing: boolean;
  pullProgress: number;
  className?: string;
}

export const NativePullIndicator = ({
  isRefreshing,
  pullProgress,
  className,
}: NativePullIndicatorProps) => {
  const rotation = isRefreshing ? 0 : pullProgress * 360;
  const scale = Math.min(pullProgress, 1);

  return (
    <div
      className={cn(
        'flex justify-center py-4 transition-opacity',
        pullProgress > 0 || isRefreshing ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={{
        transform: `scale(${scale})`,
      }}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full border-2 border-primary border-t-transparent',
          isRefreshing && 'animate-spin',
        )}
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      />
    </div>
  );
};
