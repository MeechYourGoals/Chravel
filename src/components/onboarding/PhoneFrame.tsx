/**
 * Phone Frame — Glassy wrapper for onboarding demo screens.
 *
 * Renders a realistic phone bezel with:
 * - status bar (decorative)
 * - content slot
 * - DemoTabStrip at bottom
 *
 * On mobile (<640px) the frame chrome is hidden; content fills the viewport.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { depth, radius } from './demoTokens';
import { DemoTabStrip } from './DemoPrimitives';
import type { DemoTab } from './demoTokens';
import { useOnboardingLayout } from './useOnboardingLayout';

interface PhoneFrameProps {
  activeTab: DemoTab;
  glintTab?: DemoTab;
  children: React.ReactNode;
}

export const PhoneFrame = ({ activeTab, glintTab, children }: PhoneFrameProps) => {
  const layout = useOnboardingLayout();
  const showChrome = layout !== 'mobile';

  if (!showChrome) {
    // Mobile: full-bleed, just content + tab strip
    return (
      <div className="flex flex-col h-full w-full bg-background">
        <div className="flex-1 overflow-hidden relative">{children}</div>
        <DemoTabStrip active={activeTab} glint={glintTab} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        radius.frame,
        depth.frame,
        'border border-white/10',
        'bg-background',
        'flex flex-col overflow-hidden',
        'w-[280px] h-[520px]',
        layout === 'desktop' && 'w-[300px] h-[560px]',
      )}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="text-[10px] text-muted-foreground/50 font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-1.5 rounded-sm border border-muted-foreground/30 relative">
            <div className="absolute inset-[1px] right-[2px] bg-muted-foreground/40 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">{children}</div>

      {/* Tab strip */}
      <DemoTabStrip active={activeTab} glint={glintTab} />
    </div>
  );
};
