import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Event List Skeleton
 * Loading state for calendar event lists
 */
export const EventListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Payment History Skeleton
 * Loading state for payment transaction lists
 */
export const PaymentHistorySkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Broadcast List Skeleton
 * Loading state for broadcast message lists
 */
export const BroadcastListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Channel List Skeleton
 * Loading state for role-based channel lists
 */
export const ChannelListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Balance Card Skeleton
 * Loading state for payment balance cards
 */
export const BalanceCardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded" />
            <Skeleton className="h-9 flex-1 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Task List Skeleton (Enhanced version)
 * Loading state for task/todo lists
 */
export const TaskListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Chat Message List Skeleton (Enhanced version)
 * Loading state for chat message lists
 */
export const ChatMessagesSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`flex gap-3 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2 max-w-[70%]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className={`h-16 w-full rounded-lg ${i % 3 === 0 ? 'ml-auto' : ''}`} />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Media Gallery Skeleton (Grid layout)
 * Loading state for photo/video galleries
 */
export const MediaGallerySkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="aspect-square relative">
        <Skeleton className="absolute inset-0 rounded-lg" />
      </div>
    ))}
  </div>
);
