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
}): string => 'text-black font-semibold bg-white/90 px-1 rounded inline-block break-words';
