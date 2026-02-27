import React, { useState, useCallback } from 'react';
import {
  CalendarCheck,
  Phone,
  ExternalLink,
  Pencil,
  Users,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import type { ReservationDraft } from '@/services/conciergeGateway';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReservationDraftCardProps {
  draft: ReservationDraft;
  onEdit?: (prefill: string) => void;
}

export const ReservationDraftCard: React.FC<ReservationDraftCardProps> = ({ draft, onEdit }) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const formattedDateTime = draft.startTimeISO
    ? (() => {
        const dt = new Date(draft.startTimeISO);
        const date = dt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const time = dt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        return `${date} at ${time}`;
      })()
    : null;

  const handleConfirm = useCallback(async () => {
    if (confirming || confirmed) return;
    setConfirming(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error('Please sign in to confirm reservations.');
        setConfirming(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('confirm-reservation-draft', {
        body: { draft },
      });

      if (error) {
        toast.error('Failed to confirm reservation. Please try again.');
        setConfirming(false);
        return;
      }

      if (data?.ok) {
        setConfirmed(true);
        toast.success('Reservation confirmed! Calendar event and task created.');

        // Open booking URL in new tab
        const url = draft.bookingUrl || draft.websiteUrl;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } else {
        toast.error((data as { error?: string })?.error || 'Failed to confirm reservation.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setConfirming(false);
    }
  }, [draft, confirming, confirmed]);

  const handleCall = useCallback(() => {
    if (draft.phone) {
      window.open(`tel:${draft.phone}`, '_self');
    }
  }, [draft.phone]);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(`Change the reservation for ${draft.placeName} — party size to `);
    }
  }, [draft.placeName, onEdit]);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 overflow-hidden max-w-xs lg:max-w-md w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-2">
          <CalendarCheck size={18} className="text-emerald-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white text-sm truncate">{draft.placeName}</p>
            {confirmed && <span className="text-xs text-emerald-400 font-medium">Confirmed</span>}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        {formattedDateTime && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock size={14} className="text-gray-400 shrink-0" />
            <span>{formattedDateTime}</span>
          </div>
        )}

        {draft.partySize > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Users size={14} className="text-gray-400 shrink-0" />
            <span>Party of {draft.partySize}</span>
            {draft.reservationName && (
              <span className="text-gray-500">under {draft.reservationName}</span>
            )}
          </div>
        )}

        {draft.address && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            <span className="truncate">{draft.address}</span>
          </div>
        )}

        {draft.notes && <p className="text-xs text-gray-400 italic pl-5">{draft.notes}</p>}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-emerald-500/20 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming || confirmed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirming ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          {confirmed ? 'Confirmed' : confirming ? 'Confirming...' : 'Confirm & Book'}
        </button>

        {draft.phone && (
          <button
            type="button"
            onClick={handleCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
          >
            <Phone size={14} />
            Call
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>
    </div>
  );
};
