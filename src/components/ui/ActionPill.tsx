import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ActionPill — shared action button that matches the exact dimensions of tab pills.
 *
 * Variants:
 *   manualOutline  — manual/user-entered actions: dark bg, white border, white text
 *   aiOutline      — AI-assisted actions: dark bg, gold border, gold text, star icon
 *
 * Sizing is locked to match TripTabs pill dimensions:
 *   min-h-[42px]  px-3.5  py-2.5  rounded-xl  font-medium  text-sm
 */

interface ActionPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'manualOutline' | 'aiOutline';
  /** Optional icon rendered before children (e.g. Plus, Download, Upload) */
  leftIcon?: React.ReactNode;
  /** When true, renders as a compact icon-only button (no label text) */
  iconOnly?: boolean;
}

const BASE =
  'inline-flex items-center justify-center gap-1.5 min-h-[42px] py-2.5 rounded-xl font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50';

const VARIANT_CLASSES: Record<ActionPillProps['variant'], string> = {
  manualOutline: 'bg-black/60 border border-white/30 text-white hover:bg-white/10',
  aiOutline: 'bg-black/60 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10',
};

export const ActionPill = React.forwardRef<HTMLButtonElement, ActionPillProps>(
  ({ variant, leftIcon, iconOnly = false, children, className, ...rest }, ref) => {
    const paddingClass = iconOnly ? 'px-3' : 'px-3.5';

    return (
      <button
        ref={ref}
        type="button"
        className={cn(BASE, VARIANT_CLASSES[variant], paddingClass, className)}
        {...rest}
      >
        {/* AI variant auto-prepends star when no custom leftIcon is given */}
        {variant === 'aiOutline' && !leftIcon && <Sparkles size={16} className="flex-shrink-0" />}
        {leftIcon && <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{leftIcon}</span>}
        {children}
      </button>
    );
  },
);
ActionPill.displayName = 'ActionPill';
