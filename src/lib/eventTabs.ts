export type EventTabKey =
  | 'admin'
  | 'agenda'
  | 'calendar'
  | 'chat'
  | 'lineup'
  | 'media'
  | 'polls'
  | 'tasks';

export interface EventTabConfig {
  key: EventTabKey;
  label: string;
  alwaysOn?: boolean;
}

export const EVENT_TABS_CONFIG: EventTabConfig[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'agenda', label: 'Agenda', alwaysOn: true },
  { key: 'calendar', label: 'Calendar' },
  { key: 'chat', label: 'Chat' },
  { key: 'lineup', label: 'Line-up', alwaysOn: true },
  { key: 'media', label: 'Media' },
  { key: 'polls', label: 'Polls' },
  { key: 'tasks', label: 'Tasks' },
];

export type EventEnabledTabs = Partial<Record<EventTabKey, boolean>>;

export const ALWAYS_ON_EVENT_TABS = new Set<EventTabKey>(
  EVENT_TABS_CONFIG.filter(tab => tab.alwaysOn).map(tab => tab.key),
);

export const buildEventEnabledTabs = (
  enabledFeatures: string[] | null | undefined,
): EventEnabledTabs => {
  const hasExplicitSettings = Array.isArray(enabledFeatures);
  const enabled = new Set(enabledFeatures ?? []);

  return EVENT_TABS_CONFIG.reduce<EventEnabledTabs>((acc, tab) => {
    if (tab.key === 'admin') return acc;
    acc[tab.key] = tab.alwaysOn ? true : hasExplicitSettings ? enabled.has(tab.key) : true;
    return acc;
  }, {});
};

export const isEventTabEnabled = (tabKey: EventTabKey, enabledTabs: EventEnabledTabs): boolean => {
  if (tabKey === 'admin') return true;
  if (ALWAYS_ON_EVENT_TABS.has(tabKey)) return true;
  return enabledTabs[tabKey] === true;
};
