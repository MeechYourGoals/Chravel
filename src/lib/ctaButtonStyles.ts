/**
 * Shared CTA button styles — canonical blue gradient design system.
 * Source of truth: the waveform Conversation Mode button (VoiceButton).
 *
 * All primary action buttons (Search, Upload, Send, Waveform, Dictation)
 * use these tokens to stay visually consistent.
 */

/** Primary blue gradient for idle CTA buttons */
export const CTA_GRADIENT =
  'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25';

/** Hover / active / focus-visible states for CTA buttons */
export const CTA_INTERACTIVE =
  'hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black/50';

/** Disabled state for CTA buttons */
export const CTA_DISABLED = 'disabled:opacity-50 disabled:cursor-not-allowed';

/** Fully composed CTA button (round, 44px, centered icon) */
export const CTA_BUTTON = `size-11 min-w-[44px] rounded-full flex items-center justify-center shrink-0 select-none touch-manipulation ${CTA_GRADIENT} ${CTA_INTERACTIVE} ${CTA_DISABLED}`;

/** CTA icon size — consistent across all primary buttons */
export const CTA_ICON_SIZE = 18;
