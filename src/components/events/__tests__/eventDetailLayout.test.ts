import { describe, expect, it } from 'vitest';
import {
  EVENT_CHAT_CONTENT_CLASS,
  EVENT_NON_CHAT_CONTENT_CLASS,
  getEventContentContainerClassName,
} from '../eventDetailLayout';

describe('event detail layout classes', () => {
  it('keeps chat tab on dvh-based height classes', () => {
    expect(getEventContentContainerClassName('chat')).toBe(EVENT_CHAT_CONTENT_CLASS);
    expect(EVENT_CHAT_CONTENT_CLASS).toContain('100dvh');
  });

  it('keeps non-chat tabs on legacy desktop height class', () => {
    expect(getEventContentContainerClassName('agenda')).toBe(EVENT_NON_CHAT_CONTENT_CLASS);
    expect(EVENT_NON_CHAT_CONTENT_CLASS).toContain('md:h-[calc(100vh-320px)]');
  });
});
