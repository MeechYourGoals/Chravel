<<<<<<< HEAD
import { cn } from '@/lib/utils';

export const MENTION_REGEX = /(@\w+(?:\s\w+)?)/g;

export const getMentionClassName = ({
  isOwnMessage,
  isBroadcast,
}: {
  isOwnMessage: boolean;
  isBroadcast?: boolean;
}) =>
  cn(
    'font-semibold px-1 rounded inline-block break-words',
    isOwnMessage || isBroadcast ? 'text-white bg-white/20' : 'text-sky-300 bg-sky-500/20',
  );
=======
/**
 * Mention regex: matches @Name or @First Last (up to two tokens).
 * Supports hyphens and apostrophes within tokens (@Anne-Marie, @O'Brien).
 * Second token must start with uppercase to avoid capturing trailing words.
 * Negative lookbehind prevents false positives on emails (foo@bar.com).
 */
export const MENTION_REGEX = /((?<!\w)@[\w'-]+(?:\s[A-Z][\w'-]*)?)/g;

/**
 * Uniform black-on-white pill for mentions — readable on every bubble color
 * (blue own-message, gray others, red broadcast).
 */
export const getMentionClassName = (_opts: {
  isOwnMessage: boolean;
  isBroadcast?: boolean;
}): string => 'font-semibold text-black';
>>>>>>> origin/main
