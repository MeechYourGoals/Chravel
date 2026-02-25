import React from 'react';

export const MessageSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const TaskSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-white/20" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/20 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const CalendarSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="bg-white/10 rounded-xl p-6">
      <div className="h-6 bg-white/20 rounded w-1/3 mb-4" />
      <div className="grid grid-cols-7 gap-2">
        {Array(35)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="aspect-square bg-white/10 rounded" />
          ))}
      </div>
    </div>
  </div>
);

export const MediaSkeleton = () => (
  <div className="grid grid-cols-3 gap-2 animate-pulse">
    {Array(9)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="aspect-square bg-white/10 rounded-lg" />
      ))}
  </div>
);
