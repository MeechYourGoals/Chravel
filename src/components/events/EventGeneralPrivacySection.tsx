import React from 'react';
import { Settings, Info } from 'lucide-react';

/**
 * Event-specific General & Privacy settings.
 * Organizer profile/display name is per-event (set when creating or editing each event).
 * Archived and hidden events are managed in Group Settings → Archived Trips.
 */
export const EventGeneralPrivacySection = () => (
  <div className="space-y-3">
    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
      <Settings size={24} className="text-glass-orange" />
      General & Privacy
    </h3>

    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Info size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            <strong className="text-white">Organizer display name</strong> is set per event when you
            create or edit it. Each event can have a different organizer.
          </p>
          <p className="text-sm text-gray-400">
            Archived and hidden events are managed in{' '}
            <strong className="text-gray-300">Group Settings → Archived Trips</strong>.
          </p>
        </div>
      </div>
    </div>
  </div>
);
