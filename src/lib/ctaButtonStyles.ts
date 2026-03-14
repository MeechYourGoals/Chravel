/**
 * Shared CTA button styles — gold/amber accent design system.
 * Source of truth: the waveform Conversation Mode button (VoiceButton).
 *
 * All primary action buttons (Search, Upload, Send, Waveform, Dictation)
 * use these tokens to stay visually consistent with the app's gold accent language.
 *
 * AI differentiation (Concierge active/listening states) uses blue as a transient
 * state color only — not as a permanent resting accent.
 */

/** Primary ring treatment for idle CTA buttons (Mode A — charcoal + gold border) */
export const CTA_GRADIENT = 'bg-gray-800/80 text-white cta-gold-ring';

/** Hover / active / focus-visible states for CTA buttons */
export const CTA_INTERACTIVE =
  'hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black/50';

/** Disabled state for CTA buttons — visually premium, functionally inert */
export const CTA_DISABLED = 'disabled:pointer-events-none disabled:cursor-not-allowed';

/** Fully composed CTA button (round, 44px, centered icon) */
export const CTA_BUTTON = `size-11 min-w-[44px] rounded-full flex items-center justify-center shrink-0 select-none touch-manipulation ${CTA_GRADIENT} ${CTA_INTERACTIVE} ${CTA_DISABLED}`;

/** Smaller CTA button for secondary actions (round, 36px, centered icon) */
export const CTA_BUTTON_SM = `size-9 min-w-[36px] rounded-full flex items-center justify-center shrink-0 select-none touch-manipulation ${CTA_GRADIENT} ${CTA_INTERACTIVE} ${CTA_DISABLED}`;

/** CTA icon size — consistent across all primary buttons */
export const CTA_ICON_SIZE = 18;

/** Smaller icon size for secondary CTA buttons */
export const CTA_ICON_SIZE_SM = 16;
