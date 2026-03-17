import { describe, expect, it } from 'vitest';
import { getMentionClassName, MENTION_REGEX } from '../messageMentions';

describe('MessageBubble mention styling', () => {
  it('uses white high-contrast mention style on own blue bubbles', () => {
    const className = getMentionClassName({ isOwnMessage: true, isBroadcast: false });

    expect(className).toContain('text-white');
    expect(className).toContain('font-semibold');
    expect(className).toContain('bg-white/20');
  });

  it('uses white high-contrast mention style on broadcast bubbles', () => {
    const className = getMentionClassName({ isOwnMessage: false, isBroadcast: true });

    expect(className).toContain('text-white');
    expect(className).toContain('font-semibold');
    expect(className).toContain('bg-white/20');
  });

  it('keeps non-own non-broadcast mentions visually distinct from body text', () => {
    const className = getMentionClassName({ isOwnMessage: false, isBroadcast: false });

    expect(className).toContain('text-sky-300');
    expect(className).toContain('font-semibold');
    expect(className).toContain('bg-sky-500/20');
  });

  it('matches mentions including a two-word name for renderer splitting', () => {
    const content = 'Hey @Alex Rivera and @Sam, check this';
    const parts = content.split(MENTION_REGEX);
    const mentionParts = parts.filter(part => part.startsWith('@'));

    expect(mentionParts).toEqual(['@Alex Rivera', '@Sam']);
  });
});
