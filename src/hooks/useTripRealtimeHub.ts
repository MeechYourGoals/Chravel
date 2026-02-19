/**
 * Consolidated Realtime Hub for Trip data
 * 
 * Reduces 20-35 individual Supabase channels per trip to 3 multiplexed channels:
 * 1. trip_data:{tripId} - trip_members, trip_events, trip_tasks, trip_polls, trip_payment_messages, payment_splits, trip_media
 * 2. trip_chat:{tripId} - chat_messages, message_reactions, message_read_receipts
 * 3. trip_presence:{tripId} - Presence channel for typing/online status
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type TableName = string;
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimeCallback = (payload: any) => void;

interface Subscription {
  table: TableName;
  event: EventType;
  callback: RealtimeCallback;
}

// Global hub instance per trip to prevent duplicate channels
const activeHubs = new Map<string, TripRealtimeHub>();

class TripRealtimeHub {
  private tripId: string;
  private dataChannel: any = null;
  private chatChannel: any = null;
  private presenceChannel: any = null;
  private subscribers = new Map<string, Subscription[]>();
  private refCount = 0;
  private isConnected = false;

  constructor(tripId: string) {
    this.tripId = tripId;
  }

  connect() {
    this.refCount++;
    if (this.isConnected) return;
    this.isConnected = true;

    // Channel 1: Trip data (members, events, tasks, polls, payments, media)
    const dataTables = [
      'trip_members', 'trip_events', 'trip_tasks', 'trip_polls',
      'trip_payment_messages', 'payment_splits', 'trip_media',
      'broadcasts', 'trip_basecamps'
    ];

    this.dataChannel = supabase.channel(`hub_data:${this.tripId}`);
    for (const table of dataTables) {
      this.dataChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `trip_id=eq.${this.tripId}` },
        (payload: any) => this.dispatch(table, payload)
      );
    }

    // Also listen for task_status and payment_splits (foreign key relations)
    this.dataChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_status' },
      (payload: any) => this.dispatch('task_status', payload)
    );

    this.dataChannel.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(`[RealtimeHub] Data channel error for trip ${this.tripId}`);
      }
    });

    // Channel 2: Chat (messages, reactions, read receipts)
    const chatTables = ['chat_messages', 'message_reactions', 'message_read_receipts'];
    this.chatChannel = supabase.channel(`hub_chat:${this.tripId}`);
    for (const table of chatTables) {
      const filter = table === 'chat_messages' ? `trip_id=eq.${this.tripId}` : undefined;
      this.chatChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        (payload: any) => this.dispatch(table, payload)
      );
    }
    this.chatChannel.subscribe();

    // Channel 3: Presence
    this.presenceChannel = supabase.channel(`hub_presence:${this.tripId}`);
    this.presenceChannel
      .on('presence', { event: 'sync' }, () => this.dispatch('presence_sync', {}))
      .on('presence', { event: 'join' }, (payload: any) => this.dispatch('presence_join', payload))
      .on('presence', { event: 'leave' }, (payload: any) => this.dispatch('presence_leave', payload))
      .subscribe();
  }

  private dispatch(table: string, payload: any) {
    const subs = this.subscribers.get(table) || [];
    for (const sub of subs) {
      try {
        sub.callback(payload);
      } catch (err) {
        console.error(`[RealtimeHub] Subscriber error for ${table}:`, err);
      }
    }
  }

  subscribe(table: string, event: EventType, callback: RealtimeCallback): () => void {
    const sub: Subscription = { table, event, callback };
    const existing = this.subscribers.get(table) || [];
    this.subscribers.set(table, [...existing, sub]);

    return () => {
      const current = this.subscribers.get(table) || [];
      this.subscribers.set(table, current.filter(s => s !== sub));
    };
  }

  trackPresence(userId: string) {
    if (this.presenceChannel) {
      this.presenceChannel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        trip_id: this.tripId,
      });
    }
  }

  getPresenceState() {
    return this.presenceChannel?.presenceState() || {};
  }

  disconnect() {
    this.refCount--;
    if (this.refCount > 0) return;

    this.isConnected = false;
    this.subscribers.clear();

    if (this.dataChannel) {
      supabase.removeChannel(this.dataChannel);
      this.dataChannel = null;
    }
    if (this.chatChannel) {
      supabase.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }

    activeHubs.delete(this.tripId);
  }
}

function getOrCreateHub(tripId: string): TripRealtimeHub {
  let hub = activeHubs.get(tripId);
  if (!hub) {
    hub = new TripRealtimeHub(tripId);
    activeHubs.set(tripId, hub);
  }
  return hub;
}

/**
 * Hook to connect to the consolidated realtime hub for a trip.
 * Replaces individual channel subscriptions across hooks.
 * 
 * Usage:
 *   const hub = useTripRealtimeHub(tripId);
 *   // Subscribe to specific table changes
 *   useEffect(() => {
 *     if (!hub) return;
 *     return hub.subscribe('trip_tasks', '*', (payload) => { ... });
 *   }, [hub]);
 */
export function useTripRealtimeHub(tripId: string | undefined) {
  const hubRef = useRef<TripRealtimeHub | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const hub = getOrCreateHub(tripId);
    hub.connect();
    hubRef.current = hub;

    return () => {
      hub.disconnect();
      hubRef.current = null;
    };
  }, [tripId]);

  return hubRef.current;
}

/**
 * Convenience hook: subscribe to a table's realtime changes via the hub.
 * Automatically handles cleanup.
 */
export function useHubSubscription(
  tripId: string | undefined,
  table: string,
  callback: RealtimeCallback,
  enabled = true,
) {
  const hub = useTripRealtimeHub(tripId);

  useEffect(() => {
    if (!hub || !enabled) return;
    return hub.subscribe(table, '*', callback);
  }, [hub, table, callback, enabled]);
}
