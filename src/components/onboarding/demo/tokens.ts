/**
 * Onboarding Demo Design Tokens
 *
 * Production-matched tokens extracted from real Chravel components.
 * Color discipline:
 *   Gold (bg-primary) — selection, itinerary day circles, CTA
 *   Orange (bg-orange-500) — broadcast only
 *   Blue (bg-blue-600) — "Messages" active segment, own chat bubble
 *   Emerald/Cyan gradient — concierge avatar only
 *   White/10, White/20 — pill backgrounds (inactive/active)
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
  /** Primary gold */
  primaryGold: 'bg-primary text-primary-foreground',
  /** Muted foreground text */
  mutedText: 'text-muted-foreground',
  /** Foreground text */
  fgText: 'text-foreground',
} as const;

// ── TripTabs pill bar (from TripTabs.tsx:311-322) ─────────────────────────

export const pills = {
  active: 'bg-white/20 text-white border border-white/30 shadow-sm',
  inactive: 'bg-white/10 text-gray-300',
  base: 'px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-200',
} as const;

// ── MessageTypeBar segments (from MessageTypeBar.tsx:57-88) ───────────────

export const segments = {
  bar: 'inline-flex items-center bg-neutral-900/70 backdrop-blur-md border border-white/10 rounded-xl p-0.5',
  messages: 'bg-blue-600 text-white shadow-md',
  broadcasts: 'bg-orange-500 text-white shadow-md',
  inactive: 'text-white/70',
  base: 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
} as const;

// ── Itinerary (from ItineraryView.tsx:132-159) ────────────────────────────

export const itinerary = {
  card: 'bg-slate-900/30 rounded-lg border border-slate-700/30 p-3',
  dayCircle: 'w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold',
  timelineDot: 'w-3 h-3 bg-primary rounded-full shrink-0',
  timelineConnector: 'w-0.5 bg-slate-600',
  categoryDining: 'bg-red-500/20 text-red-300 border border-red-500/20',
  categoryActivity: 'bg-green-500/20 text-green-300 border border-green-500/20',
} as const;

// ── Concierge (from MessageRenderer.tsx:151) ──────────────────────────────

export const concierge = {
  avatar: 'bg-gradient-to-r from-blue-500 to-emerald-500',
  card: 'bg-card border border-emerald-500/20 rounded-xl',
  imagePlaceholder: 'bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg',
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
  slideIn: { duration: 0.32, ease: 'easeOut' as const },
  micro: { duration: 0.2, ease: 'easeOut' as const },
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

// ── Demo pill identifiers ────────────────────────────────────────────────

export type DemoPill = 'chat' | 'calendar' | 'concierge' | 'payments';

// ── Loop timing (seconds) ────────────────────────────────────────────────

export const LOOP_DURATION = 6;
export const RESET_DURATION = 0.2;
