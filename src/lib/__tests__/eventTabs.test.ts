import { buildEventEnabledTabs, isEventTabEnabled } from '@/lib/eventTabs';

describe('eventTabs helpers', () => {
  it('keeps always-on tabs enabled regardless of enabled features', () => {
    const enabledTabs = buildEventEnabledTabs(['chat']);

    expect(isEventTabEnabled('agenda', enabledTabs)).toBe(true);
    expect(isEventTabEnabled('lineup', enabledTabs)).toBe(true);
  });

  it('defaults optional tabs to enabled when settings are missing', () => {
    const enabledTabs = buildEventEnabledTabs(undefined);

    expect(isEventTabEnabled('chat', enabledTabs)).toBe(true);
    expect(isEventTabEnabled('tasks', enabledTabs)).toBe(true);
  });

  it('respects organizer toggles for non always-on tabs', () => {
    const enabledTabs = buildEventEnabledTabs(['calendar', 'polls']);

    expect(isEventTabEnabled('calendar', enabledTabs)).toBe(true);
    expect(isEventTabEnabled('polls', enabledTabs)).toBe(true);
    expect(isEventTabEnabled('tasks', enabledTabs)).toBe(false);
  });
});
