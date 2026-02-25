import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  thickness?: number;
  showPercentage?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const sizeConfig = {
  sm: { width: 40, height: 40, fontSize: 'text-xs' },
  md: { width: 60, height: 60, fontSize: 'text-sm' },
  lg: { width: 80, height: 80, fontSize: 'text-base' },
};

export const ProgressRing = ({
  progress,
  size = 'md',
  thickness = 4,
  showPercentage = false,
  className,
  children,
}: ProgressRingProps) => {
  const { width, height, fontSize } = sizeConfig[size];
  const radius = (Math.min(width, height) - thickness) / 2;
  const circumference = radius * Math.PI * 2;
  const strokeDashOffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width, height }}
    >
      <svg width={width} height={height} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={thickness}
          fill="transparent"
          className="text-white/20"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={thickness}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashOffset}
          strokeLinecap="round"
          className="text-yellow-400 transition-all duration-700 ease-out"
          style={{
            filter: progress > 0 ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))' : 'none',
          }}
        />
      </svg>

      {/* Content */}
      <div className={cn('absolute inset-0 flex items-center justify-center', fontSize)}>
        {children ||
          (showPercentage && (
            <span className="font-semibold text-white">{Math.round(progress)}%</span>
          ))}
      </div>
    </div>
  );
};
