import { create } from 'zustand';
import { SmartParseResult } from '@/utils/calendarImportParsers';
import { AgendaParseResult } from '@/utils/agendaImportParsers';

interface BackgroundImportStore {
  // Calendar Import State
  isCalendarImporting: boolean;
  calendarPendingResult: SmartParseResult | null;
  calendarSourceUrl: string | null;
  calendarToastId: string | number | null;
  calendarAbortController: AbortController | null;

  setCalendarImportState: (state: Partial<Pick<BackgroundImportStore, 'isCalendarImporting' | 'calendarPendingResult' | 'calendarSourceUrl' | 'calendarToastId' | 'calendarAbortController'>>) => void;
  clearCalendarResult: () => void;

  // Agenda Import State
  isAgendaImporting: boolean;
  agendaPendingResult: AgendaParseResult | null;
  agendaSourceUrl: string | null;
  agendaToastId: string | number | null;
  agendaAbortController: AbortController | null;

  setAgendaImportState: (state: Partial<Pick<BackgroundImportStore, 'isAgendaImporting' | 'agendaPendingResult' | 'agendaSourceUrl' | 'agendaToastId' | 'agendaAbortController'>>) => void;
  clearAgendaResult: () => void;
}

export const useBackgroundImportStore = create<BackgroundImportStore>((set) => ({
  // Calendar Initial State
  isCalendarImporting: false,
  calendarPendingResult: null,
  calendarSourceUrl: null,
  calendarToastId: null,
  calendarAbortController: null,

  setCalendarImportState: (state) => set((prev) => ({ ...prev, ...state })),
  clearCalendarResult: () => set({
    isCalendarImporting: false,
    calendarPendingResult: null,
    calendarSourceUrl: null,
    calendarToastId: null,
    calendarAbortController: null,
  }),

  // Agenda Initial State
  isAgendaImporting: false,
  agendaPendingResult: null,
  agendaSourceUrl: null,
  agendaToastId: null,
  agendaAbortController: null,

  setAgendaImportState: (state) => set((prev) => ({ ...prev, ...state })),
  clearAgendaResult: () => set({
    isAgendaImporting: false,
    agendaPendingResult: null,
    agendaSourceUrl: null,
    agendaToastId: null,
    agendaAbortController: null,
  }),
}));
