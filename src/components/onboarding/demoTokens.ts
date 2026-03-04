/**
 * Onboarding Demo Design Tokens
 *
 * Maps to real CSS variables from index.css to prevent visual drift.
 * All demo screens import from here — single source of truth.
 */

// ── Semantic color classes (mapped to real app CSS vars) ──────────────────

export const colors = {
  /** iMessage blue — var(--chat-bubble-own) */
  chatBubbleOwn: 'bg-[hsl(var(--chat-bubble-own))] text-[hsl(var(--chat-bubble-own-foreground))]',
  /** Other user messages */
  chatBubbleOther: 'bg-muted text-foreground',
  /** Broadcast — orange-500 matches real MessageBubble broadcast styling */
  broadcast: 'bg-orange-500 text-white',
  /** Card background — matches EventItem / PaymentCard */
  card: 'bg-card border border-border',
  /** Payment owed state */
  paymentOwed: 'bg-card/50 border border-border',
  /** Payment settled state */
  paymentSettled: 'bg-green-500/5 border border-green-500/20',
  /** AI concierge gradient */
  conciergeGradient: 'bg-gradient-to-r from-emerald-600 to-cyan-600',
  /** Primary gold */
  primaryGold: 'bg-primary text-primary-foreground',
  /** Muted foreground text */
  mutedText: 'text-muted-foreground',
  /** Foreground text */
  fgText: 'text-foreground',
} as const;

// ── Layout tokens ─────────────────────────────────────────────────────────

export const radius = {
  bubble: 'rounded-2xl',
  card: 'rounded-xl',
  chip: 'rounded-full',
  frame: 'rounded-[2rem]',
  avatar: 'rounded-full',
} as const;

export const spacing = {
  cardPadding: 'p-3',
  bubblePadding: 'px-4 py-2.5',
  chipPadding: 'px-2.5 py-0.5',
} as const;

// ── Shadow + depth ────────────────────────────────────────────────────────

export const depth = {
  frame: 'shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]',
  card: 'shadow-sm',
  toast: 'shadow-lg',
} as const;

// ── Motion presets (Framer Motion) ────────────────────────────────────────

export const motion = {
  /** Standard slide-in for messages, cards */
  slideIn: { duration: 0.32, ease: 'easeOut' as const },
  /** Faster micro-interactions */
  micro: { duration: 0.2, ease: 'easeOut' as const },
  /** Crossfade for loop resets */
  crossfade: { duration: 0.2, ease: 'easeInOut' as const },
} as const;

// ── Typography ────────────────────────────────────────────────────────────

export const type = {
  screenTitle: 'text-2xl sm:text-3xl font-bold text-foreground',
  screenSubline: 'text-muted-foreground text-base sm:text-lg max-w-sm',
  cardTitle: 'text-sm font-medium text-foreground',
  cardBody: 'text-xs text-muted-foreground',
  chipLabel: 'text-[10px] font-semibold',
  bubbleSender: 'text-[11px] font-medium text-muted-foreground mb-0.5',
  bubbleText: 'text-sm',
} as const;

// ── Demo tab identifiers ─────────────────────────────────────────────────

export type DemoTab = 'chat' | 'calendar' | 'payments' | 'ai';

// ── Loop timing (seconds) ────────────────────────────────────────────────

export const LOOP_DURATION = 6;
export const RESET_DURATION = 0.2;
