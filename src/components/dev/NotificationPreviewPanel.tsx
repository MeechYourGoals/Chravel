/**
 * Dev-only Notification Preview Panel
 *
 * Allows developers to:
 * - Pick a notification type
 * - Pick a channel (push/email/sms)
 * - Enter sample trip/event context
 * - Preview the generated copy/template
 *
 * Only renders when import.meta.env.DEV is true.
 */

import React, { useState, useMemo } from 'react';
import {
  buildAllChannelContent,
  type NotificationContentType,
  type TripContext,
} from '@/lib/notifications/contentBuilder';

const NOTIFICATION_TYPES: { value: NotificationContentType; label: string }[] = [
  { value: 'broadcast_posted', label: 'Broadcast Posted' },
  { value: 'calendar_event_added', label: 'Calendar Event Added' },
  { value: 'calendar_event_updated', label: 'Calendar Event Updated' },
  { value: 'calendar_bulk_import', label: 'Calendar Bulk Import' },
  { value: 'payment_request', label: 'Payment Request' },
  { value: 'payment_settled', label: 'Payment Settled' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'poll_created', label: 'Poll Created' },
  { value: 'join_request', label: 'Join Request' },
  { value: 'join_request_approved', label: 'Join Request Approved' },
  { value: 'basecamp_updated', label: 'Basecamp Updated' },
  { value: 'trip_invite', label: 'Trip Invitation' },
  { value: 'trip_reminder', label: 'Trip Reminder' },
  { value: 'rsvp_update', label: 'RSVP Update' },
];

export const NotificationPreviewPanel = () => {
  const [type, setType] = useState<NotificationContentType>('broadcast_posted');
  const [tripName, setTripName] = useState('Japan Trip');
  const [location, setLocation] = useState('Tokyo, Kyoto, Osaka');
  const [startDate, setStartDate] = useState('2026-06-10');
  const [endDate, setEndDate] = useState('2026-06-25');
  const [actorName, setActorName] = useState('Tour Manager');
  const [count, setCount] = useState(22);

  const tripContext: TripContext = useMemo(
    () => ({
      tripName,
      location: location
        .split(',')
        .map(l => l.trim())
        .filter(Boolean),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [tripName, location, startDate, endDate],
  );

  const allContent = useMemo(
    () => buildAllChannelContent(type, tripContext, actorName, count),
    [type, tripContext, actorName, count],
  );

  if (!import.meta.env.DEV) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-mono rounded">
          DEV
        </span>
        <h3 className="text-lg font-bold text-white">Notification Preview</h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notification Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as NotificationContentType)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          >
            {NOTIFICATION_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Actor Name</label>
          <input
            value={actorName}
            onChange={e => setActorName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Trip Name</label>
          <input
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Location (comma-separated)</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {type === 'calendar_bulk_import' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Event Count</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Preview Output */}
      <div className="space-y-4">
        {/* Push Preview */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">
              PUSH
            </span>
          </div>
          <p className="text-white font-semibold text-sm">{allContent.push.title}</p>
          <p className="text-gray-300 text-sm mt-1">{allContent.push.body}</p>
        </div>

        {/* Email Preview */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-mono rounded">
              EMAIL
            </span>
          </div>
          <p className="text-gray-400 text-xs">
            From: Chravel Support &lt;support@chravelapp.com&gt;
          </p>
          <p className="text-white font-semibold text-sm mt-1">
            Subject: {allContent.email.subject}
          </p>
          <p className="text-gray-300 text-sm mt-1">{allContent.email.bodyText}</p>
          <p className="text-blue-400 text-xs mt-2">
            CTA: {allContent.email.ctaLabel} → {allContent.email.ctaUrl}
          </p>
          <p className="text-gray-500 text-xs mt-1">{allContent.email.footerText}</p>
        </div>

        {/* SMS Preview */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-mono rounded">
              SMS
            </span>
            <span className="text-gray-500 text-xs">{allContent.sms.message.length} chars</span>
          </div>
          <p className="text-gray-300 text-sm font-mono">{allContent.sms.message}</p>
        </div>
      </div>
    </div>
  );
};
