import React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

interface InteractiveButtonProps extends ButtonProps {
  loading?: boolean;
  success?: boolean;
  microAnimation?: 'scale' | 'pulse' | 'none';
}

export const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  (
    {
      className,
      loading = false,
      success = false,
      microAnimation = 'scale',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const getAnimationClass = () => {
      switch (microAnimation) {
        case 'scale':
          return 'transition-all duration-200 hover:scale-105 active:scale-95';
        case 'pulse':
          return 'transition-all duration-200 hover:scale-102 active:scale-98';
        default:
          return '';
      }
    };

    return (
      <Button
        ref={ref}
        className={cn(
          getAnimationClass(),
          success && 'bg-green-500 hover:bg-green-600',
          loading && 'opacity-70 cursor-not-allowed',
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </div>
        ) : success ? (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {children}
          </div>
        ) : (
          children
        )}
      </Button>
    );
  },
);

InteractiveButton.displayName = 'InteractiveButton';
