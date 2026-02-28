/**
 * Background Agenda Import Hook
 *
 * Runs agenda URL imports in the background so the organizer can navigate
 * away. Shows persistent Sonner toast notifications and stores the result
 * for the AgendaImportModal to consume.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { parseAgendaURL } from '@/utils/agendaImportParsers';
import { useBackgroundImportStore } from '../stores/useBackgroundImportStore';
import { useNavigate } from 'react-router-dom';

export function useBackgroundAgendaImport(eventId?: string) {
  const navigate = useNavigate();

  const {
    isAgendaImporting: isImporting,
    agendaPendingResult: pendingResult,
    agendaSourceUrl: sourceUrl,
    agendaToastId: toastId,
    agendaAbortController: abortController,
    setAgendaImportState: setState,
    clearAgendaResult: clearResult,
  } = useBackgroundImportStore();

  const startImport = useCallback(
    (url: string, onComplete?: () => void) => {
      if (useBackgroundImportStore.getState().isAgendaImporting) {
        toast.warning('An import is already in progress');
        return;
      }

      let domain = url;
      try {
        domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      } catch {
        // Use raw URL as fallback
      }

      const currentController = new AbortController();

      const newToastId = toast.loading(`Scanning ${domain} for agenda sessions...`, {
        duration: Infinity,
        description: "You can navigate away — we'll notify you when it's done.",
      });

      setState({
        isAgendaImporting: true,
        agendaPendingResult: null,
        agendaSourceUrl: url,
        agendaToastId: newToastId,
        agendaAbortController: currentController,
      });

      parseAgendaURL(url)
        .then(result => {
          if (currentController.signal.aborted) return;

          setState({
            isAgendaImporting: false,
            agendaPendingResult: result,
            agendaSourceUrl: url,
          });

          toast.dismiss(newToastId);

          if (result.isValid && result.sessions.length > 0) {
            toast.success(
              `Found ${result.sessions.length} session${result.sessions.length !== 1 ? 's' : ''} from ${domain}`,
              {
                description: 'Review and import them into your agenda.',
                duration: Infinity,
                action: {
                  label: 'Review Sessions',
                  onClick: () => {
                    // Navigate to the event agenda page if not there
                    if (eventId && !window.location.pathname.includes(`/events/${eventId}`)) {
                      navigate(`/events/${eventId}?tab=agenda&import=true`);
                    } else if (onComplete) {
                      onComplete();
                    }
                  },
                },
              },
            );
          } else {
            toast.error('Import failed', {
              description: result.errors[0] || 'No agenda sessions found on this page',
              duration: 8000,
            });
          }
        })
        .catch(err => {
          if (currentController.signal.aborted) return;

          setState({
            isAgendaImporting: false,
            agendaPendingResult: null,
            agendaSourceUrl: null,
          });

          toast.dismiss(newToastId);

          toast.error('Import failed', {
            description: err instanceof Error ? err.message : 'Unknown error occurred',
            duration: 8000,
          });
        });
    },
    [setState, eventId, navigate],
  );

  const cancelImport = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    if (toastId) {
      toast.dismiss(toastId);
    }
    clearResult();
    toast.info('Import cancelled');
  }, [abortController, toastId, clearResult]);

  return {
    isBackgroundImporting: isImporting,
    pendingResult,
    sourceUrl,
    startImport,
    clearResult,
    cancelImport,
  };
}
