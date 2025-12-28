import type { ExportSection } from '@/types/tripExport';

export const DEFAULT_EXPORT_SECTION_ORDER: ExportSection[] = [
  'calendar',
  'payments',
  'polls',
  'places',
  'attachments',
  'tasks',
  'broadcasts',
  'roster',
];

export const orderExportSections = (sections: ExportSection[]): ExportSection[] => {
  const order = new Map(DEFAULT_EXPORT_SECTION_ORDER.map((section, index) => [section, index]));
  return [...sections].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
};
