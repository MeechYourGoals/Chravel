import { buildEventEnabledTabs, isEventTabEnabled, resolveEventTabsForRole } from '@/lib/eventTabs';

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

  it('hides admin tab for attendees while preserving all attendee-facing tabs', () => {
    const enabledTabs = buildEventEnabledTabs(['chat']);
    const tabs = resolveEventTabsForRole(enabledTabs, false);

    expect(tabs.some(tab => tab.key === 'admin')).toBe(false);
    expect(tabs.some(tab => tab.key === 'chat')).toBe(true);
    expect(tabs.find(tab => tab.key === 'calendar')?.isEnabled).toBe(false);
  });

  it('shows admin tab for organizers', () => {
    const enabledTabs = buildEventEnabledTabs(['chat']);
    const tabs = resolveEventTabsForRole(enabledTabs, true);

    expect(tabs.some(tab => tab.key === 'admin')).toBe(true);
  });
});
