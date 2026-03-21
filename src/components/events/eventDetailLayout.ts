export const EVENT_CHAT_CONTENT_CLASS =
  'h-[calc(100dvh-200px)] sm:h-[calc(100dvh-220px)] md:h-[calc(100vh-240px)]';

export const EVENT_NON_CHAT_CONTENT_CLASS =
  'pb-24 sm:pb-4 h-auto max-h-none md:h-[calc(100vh-320px)] md:max-h-[1000px] md:min-h-[500px]';

export const getEventContentContainerClassName = (activeTab: string): string =>
  activeTab === 'chat' ? EVENT_CHAT_CONTENT_CLASS : EVENT_NON_CHAT_CONTENT_CLASS;
