/**
 * Onboarding Demo UI Primitives
 *
 * Production-matched building blocks extracted from real Chravel components.
 * Uses shared demo tokens — single source of truth.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  colors, radius, spacing, depth, type as typo, motion as motionPreset,
  pills, segments, itinerary, concierge,
  type DemoPill,
} from './tokens';
import { Clock, MapPin, ExternalLink } from 'lucide-react';

// ── DemoAvatar ────────────────────────────────────────────────────────────

interface DemoAvatarProps {
  initial: string;
  color: string;
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
  showBroadcastLabel?: boolean;
  className?: string;
}

export const DemoBubble = ({ variant, sender, text, avatar, showBroadcastLabel, className }: DemoBubbleProps) => {
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
        'flex flex-col gap-0.5 max-w-[85%]',
        isOwn ? 'self-end items-end' : 'self-start items-start',
        className,
      )}
    >
      {/* Broadcast label pill */}
      {isBroadcast && showBroadcastLabel && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, ...motionPreset.micro }}
          className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-0.5"
        >
          📢 Broadcast
        </motion.span>
      )}
      <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : '')}>
        {avatar && !isOwn && <DemoAvatar initial={avatar.initial} color={avatar.color} size="sm" />}
        <div>
          {sender && !isOwn && <p className={typo.bubbleSender}>{sender}</p>}
          <div className={cn(radius.bubble, spacing.bubblePadding, bubbleColor)}>
            <p className={typo.bubbleText}>{isBroadcast ? `📢 ${text}` : text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── DemoCard ──────────────────────────────────────────────────────────────

interface DemoCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'settled' | 'itinerary';
  className?: string;
}

export const DemoCard = ({ children, variant = 'default', className }: DemoCardProps) => (
  <div
    className={cn(
      variant === 'itinerary' ? itinerary.card : radius.card,
      variant !== 'itinerary' && spacing.cardPadding,
      depth.card,
      variant === 'settled' ? colors.paymentSettled
        : variant === 'itinerary' ? ''
        : colors.card,
      className,
    )}
  >
    {children}
  </div>
);

// ── DemoChip ──────────────────────────────────────────────────────────────

interface DemoChipProps {
  label: string;
  variant: 'pending' | 'settled' | 'action' | 'saved' | 'dining' | 'activity';
  className?: string;
}

const chipVariants: Record<DemoChipProps['variant'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  settled: 'bg-green-500/10 text-green-400 border border-green-500/20',
  action: 'bg-primary/10 text-primary border border-primary/20',
  saved: 'bg-green-500/10 text-green-400 border border-green-500/20',
  dining: itinerary.categoryDining,
  activity: itinerary.categoryActivity,
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

// ── DemoPillBar (replaces DemoTabStrip — top pill tabs) ───────────────────

const PILLS: { id: DemoPill; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'concierge', label: 'Concierge' },
  { id: 'payments', label: 'Payments' },
];

interface DemoPillBarProps {
  active: DemoPill;
  glint?: DemoPill;
}

export const DemoPillBar = ({ active, glint }: DemoPillBarProps) => (
  <div className="flex items-center gap-1.5 px-2.5 py-2 overflow-x-auto scrollbar-none">
    {PILLS.map(({ id, label }) => {
      const isActive = id === active;
      const isGlint = id === glint;

      return (
        <div
          key={id}
          className={cn(
            pills.base,
            isActive ? pills.active : pills.inactive,
            isGlint && !isActive && 'ring-1 ring-emerald-400/40 text-emerald-300',
          )}
        >
          {label}
        </div>
      );
    })}
  </div>
);

// ── DemoSegmentedControl (MessageTypeBar replica) ─────────────────────────

interface DemoSegmentedControlProps {
  active: 'messages' | 'broadcasts';
}

export const DemoSegmentedControl = ({ active }: DemoSegmentedControlProps) => (
  <div className={cn(segments.bar, 'w-full justify-center gap-0.5')}>
    <div
      className={cn(
        segments.base,
        active === 'messages' ? segments.messages : segments.inactive,
      )}
    >
      Messages
    </div>
    <div
      className={cn(
        segments.base,
        active === 'broadcasts' ? segments.broadcasts : segments.inactive,
      )}
    >
      Broadcasts
    </div>
  </div>
);

// ── DemoDayHeader (Itinerary day circle + date) ───────────────────────────

interface DemoDayHeaderProps {
  day: number;
  date: string;
}

export const DemoDayHeader = ({ day, date }: DemoDayHeaderProps) => (
  <div className="flex items-center gap-3">
    <div className={itinerary.dayCircle}>{day}</div>
    <span className="text-sm font-medium text-foreground">{date}</span>
  </div>
);

// ── DemoTimelineEvent (Itinerary event card with timeline dot) ────────────

interface DemoTimelineEventProps {
  emoji: string;
  title: string;
  category: 'dining' | 'activity';
  categoryLabel: string;
  time: string;
  location: string;
}

export const DemoTimelineEvent = ({
  emoji, title, category, categoryLabel, time, location,
}: DemoTimelineEventProps) => (
  <div className="flex gap-3 pl-1">
    {/* Timeline connector */}
    <div className="flex flex-col items-center">
      <div className={itinerary.timelineDot} />
      <div className={cn(itinerary.timelineConnector, 'flex-1 min-h-[2rem]')} />
    </div>
    {/* Event card */}
    <div className={cn(itinerary.card, 'flex-1')}>
      <div className="flex items-start gap-2.5">
        <span className="text-base">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={typo.cardTitle}>{title}</p>
            <DemoChip label={categoryLabel} variant={category} />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{location}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── DemoConciergeCard (Rich AI response card) ─────────────────────────────

interface DemoConciergeCardProps {
  query: string;
  title: string;
  rating: string;
  bullets: string[];
  linkText: string;
  saveLabel: string;
  onSaveState: 'idle' | 'saved';
}

export const DemoConciergeCard = ({
  query, title, rating, bullets, linkText, saveLabel, onSaveState,
}: DemoConciergeCardProps) => (
  <div className={cn(concierge.card, 'p-3 space-y-2.5')}>
    {/* User query */}
    <div className="flex items-start gap-2">
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white', concierge.avatar)}>
        CA
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-muted-foreground italic">"{query}"</p>
      </div>
    </div>

    {/* Image placeholder */}
    <div className={cn(concierge.imagePlaceholder, 'h-16 w-full flex items-center justify-center')}>
      <span className="text-2xl">🍣</span>
    </div>

    {/* Response content */}
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <span className="text-[11px] text-muted-foreground">{rating}</span>
      </div>
      <ul className="space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
            {b}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1 mt-1.5">
        <ExternalLink className="w-3 h-3 text-primary" />
        <span className="text-[10px] text-primary font-medium">{linkText}</span>
      </div>
    </div>

    {/* Save to Trip action */}
    <div className="flex justify-end">
      <motion.div
        animate={onSaveState === 'saved' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.2 }}
      >
        <DemoChip
          label={saveLabel}
          variant={onSaveState === 'saved' ? 'saved' : 'action'}
        />
      </motion.div>
    </div>
  </div>
);
