import { describe, expect, it } from 'vitest';
import { getMentionClassName, MENTION_REGEX } from '../messageMentions';

describe('MessageBubble mention styling', () => {
  it('uses black-on-white pill for own messages', () => {
    const className = getMentionClassName({ isOwnMessage: true, isBroadcast: false });

    expect(className).toContain('text-black');
    expect(className).toContain('font-semibold');
    expect(className).toContain('bg-white/90');
  });

  it('uses black-on-white pill for broadcast messages', () => {
    const className = getMentionClassName({ isOwnMessage: false, isBroadcast: true });

    expect(className).toContain('text-black');
    expect(className).toContain('font-semibold');
    expect(className).toContain('bg-white/90');
  });

  it('uses black-on-white pill for other users messages', () => {
    const className = getMentionClassName({ isOwnMessage: false, isBroadcast: false });

    expect(className).toContain('text-black');
    expect(className).toContain('font-semibold');
    expect(className).toContain('bg-white/90');
  });

  it('matches two-word mention names', () => {
    const content = 'Hey @Alex Rivera and @Sam, check this';
    MENTION_REGEX.lastIndex = 0;
    const parts = content.split(MENTION_REGEX);
    const mentionParts = parts.filter(part => {
      MENTION_REGEX.lastIndex = 0;
      return MENTION_REGEX.test(part);
    });

    expect(mentionParts).toEqual(['@Alex Rivera', '@Sam']);
  });

  it('matches hyphenated names like @Anne-Marie', () => {
    const content = 'cc @Anne-Marie please';
    MENTION_REGEX.lastIndex = 0;
    const parts = content.split(MENTION_REGEX);
    const mentionParts = parts.filter(part => {
      MENTION_REGEX.lastIndex = 0;
      return MENTION_REGEX.test(part);
    });

    expect(mentionParts).toEqual(['@Anne-Marie']);
  });

  it('does not match email addresses like foo@bar.com', () => {
    const content = 'Email me at foo@bar.com';
    MENTION_REGEX.lastIndex = 0;
    const parts = content.split(MENTION_REGEX);
    const mentionParts = parts.filter(part => {
      MENTION_REGEX.lastIndex = 0;
      return MENTION_REGEX.test(part);
    });

    expect(mentionParts).toEqual([]);
  });
});
