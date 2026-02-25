import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isConsumerTrip } from '@/utils/tripTierDetector';
import { format } from 'date-fns';

interface SystemEvent {
  id: string;
  content: string;
  system_event_type: string;
  payload: any;
  created_at: string;
}

interface EventLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

export const EventLogDrawer: React.FC<EventLogDrawerProps> = ({ isOpen, onClose, tripId }) => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isConsumer = isConsumerTrip(tripId);

  useEffect(() => {
    if (isConsumer && isOpen) {
      fetchEvents();
    }
  }, [isConsumer, isOpen, tripId]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('id, content, system_event_type, payload, created_at')
        .eq('trip_id', tripId)
        .eq('message_type', 'system')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[EventLog] Failed to fetch:', error);
        return;
      }

      setEvents((data || []) as SystemEvent[]);
    } catch (error) {
      console.error('[EventLog] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAllToClipboard = async () => {
    const json = JSON.stringify(events, null, 2);
    await navigator.clipboard.writeText(json);
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyEventToClipboard = async (event: SystemEvent) => {
    const json = JSON.stringify(event, null, 2);
    await navigator.clipboard.writeText(json);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Only render for consumer trips
  if (!isConsumer) {
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Event Log</h2>
            <span className="text-sm text-muted-foreground">({events.length} events)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAllToClipboard}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              {copiedId === 'all' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy All
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No system events found</div>
          ) : (
            events.map(event => (
              <div key={event.id} className="border border-border rounded-xl p-3 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{event.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'MMM d, h:mm a')}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {event.system_event_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                    >
                      {expandedId === event.id ? 'Hide' : 'JSON'}
                    </button>
                    <button
                      onClick={() => copyEventToClipboard(event)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      {copiedId === event.id ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                {expandedId === event.id && event.payload && (
                  <pre className="mt-2 p-2 bg-muted rounded-lg text-xs overflow-x-auto text-muted-foreground">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
