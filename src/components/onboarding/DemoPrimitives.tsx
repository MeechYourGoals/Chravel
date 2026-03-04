/**
 * Onboarding Demo UI Primitives
 *
 * Lightweight, zero-dependency building blocks that replicate
 * real Chravel UI styling using shared demoTokens.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { colors, radius, spacing, depth, type as typo, motion as motionPreset } from './demoTokens';

// ── DemoAvatar ────────────────────────────────────────────────────────────

interface DemoAvatarProps {
  initial: string;
  color: string; // tailwind bg class e.g. 'bg-blue-500'
  size?: 'sm' | 'md';
}

export const DemoAvatar = ({ initial, color, size = 'md' }: DemoAvatarProps) => (
  <div
    className={cn(
      radius.avatar,
      'flex items-center justify-center text-white font-semibold shrink-0',
      color,
      size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm',
    )}
  >
    {initial}
  </div>
);

// ── DemoBubble ────────────────────────────────────────────────────────────

interface DemoBubbleProps {
  variant: 'own' | 'other' | 'broadcast';
  sender?: string;
  text: string;
  avatar?: { initial: string; color: string };
  className?: string;
}

export const DemoBubble = ({ variant, sender, text, avatar, className }: DemoBubbleProps) => {
  const isOwn = variant === 'own';
  const isBroadcast = variant === 'broadcast';

  const bubbleColor =
    variant === 'own'
      ? colors.chatBubbleOwn
      : variant === 'broadcast'
        ? colors.broadcast
        : colors.chatBubbleOther;

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        isOwn ? 'self-end flex-row-reverse' : 'self-start',
        className,
      )}
    >
      {avatar && !isOwn && <DemoAvatar initial={avatar.initial} color={avatar.color} size="sm" />}
      <div>
        {sender && !isOwn && <p className={typo.bubbleSender}>{sender}</p>}
        <div className={cn(radius.bubble, spacing.bubblePadding, bubbleColor)}>
          <p className={typo.bubbleText}>{isBroadcast ? `📢 ${text}` : text}</p>
        </div>
      </div>
    </div>
  );
};

// ── DemoCard ──────────────────────────────────────────────────────────────

interface DemoCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'settled';
  className?: string;
}

export const DemoCard = ({ children, variant = 'default', className }: DemoCardProps) => (
  <div
    className={cn(
      radius.card,
      spacing.cardPadding,
      depth.card,
      variant === 'settled' ? colors.paymentSettled : colors.card,
      className,
    )}
  >
    {children}
  </div>
);

// ── DemoChip ──────────────────────────────────────────────────────────────

interface DemoChipProps {
  label: string;
  variant: 'pending' | 'settled' | 'action' | 'saved';
  className?: string;
}

const chipVariants: Record<DemoChipProps['variant'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  settled: 'bg-green-500/10 text-green-400 border border-green-500/20',
  action: 'bg-primary/10 text-primary border border-primary/20',
  saved: 'bg-green-500/10 text-green-400 border border-green-500/20',
};

export const DemoChip = ({ label, variant, className }: DemoChipProps) => (
  <span
    className={cn(
      radius.chip,
      spacing.chipPadding,
      typo.chipLabel,
      chipVariants[variant],
      className,
    )}
  >
    {label}
  </span>
);

// ── DemoToast ─────────────────────────────────────────────────────────────

interface DemoToastProps {
  text: string;
  show: boolean;
}

export const DemoToast = ({ text, show }: DemoToastProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
    transition={motionPreset.slideIn}
    className={cn(
      radius.card,
      'px-3 py-1.5',
      depth.toast,
      'bg-green-500/10 border border-green-500/20 text-green-400',
      typo.chipLabel,
      'pointer-events-none',
    )}
  >
    ✓ {text}
  </motion.div>
);

// ── DemoTabStrip ──────────────────────────────────────────────────────────

import type { DemoTab } from './demoTokens';
import { MessageCircle, Calendar, DollarSign, Sparkles } from 'lucide-react';

const tabs: { id: DemoTab; icon: React.ElementType; label: string }[] = [
  { id: 'chat', icon: MessageCircle, label: 'Chat' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'payments', icon: DollarSign, label: 'Payments' },
  { id: 'ai', icon: Sparkles, label: 'AI' },
];

interface DemoTabStripProps {
  active: DemoTab;
  glint?: DemoTab; // optional secondary highlight (AI cameo)
}

export const DemoTabStrip = ({ active, glint }: DemoTabStripProps) => (
  <div className="flex items-center justify-around px-2 py-2 border-t border-border/30 bg-card/50">
    {tabs.map(({ id, icon: Icon, label }) => {
      const isActive = id === active;
      const isGlint = id === glint;

      return (
        <div key={id} className="flex flex-col items-center gap-0.5 relative">
          <Icon
            className={cn(
              'w-4 h-4 transition-colors duration-200',
              isActive ? 'text-primary' : isGlint ? 'text-emerald-400' : 'text-muted-foreground/50',
            )}
          />
          <span
            className={cn(
              'text-[9px] transition-colors duration-200',
              isActive ? 'text-primary font-medium' : isGlint ? 'text-emerald-400' : 'text-muted-foreground/40',
            )}
          >
            {label}
          </span>
          {isActive && (
            <motion.div
              layoutId="onboarding-tab-indicator"
              className="absolute -bottom-2 w-6 h-0.5 bg-primary rounded-full"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          )}
        </div>
      );
    })}
  </div>
);
