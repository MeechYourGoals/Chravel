import React from 'react';
import { Skeleton } from './skeleton';

interface TripCardSkeletonProps {
  count?: number;
}

export const TripCardSkeleton = ({ count = 3 }: TripCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-card rounded-enterprise p-6 border border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-16 w-16 rounded-lg" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full" />
            ))}
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </>
  );
};

export const StatsSkeletonGrid = () => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-card rounded-enterprise p-4 text-center border border-border"
        >
          <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
          <Skeleton className="h-8 w-12 mx-auto mb-1" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
};

export const ProfileHeaderSkeleton = () => {
  return (
    <div className="text-center mb-8">
      <Skeleton className="w-24 h-24 mx-auto mb-4 rounded-full" />
      <Skeleton className="h-8 w-32 mx-auto mb-1" />
      <Skeleton className="h-4 w-24 mx-auto mb-4" />
      <div className="flex gap-2 justify-center">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
};
