import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../ui/use-toast';

// Common timezones with DST support
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Alaska', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Hawaii', region: 'Pacific' },
  { value: 'America/Phoenix', label: 'Arizona (No DST)', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', region: 'Americas' },
  { value: 'Europe/London', label: 'London', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow', region: 'Europe' },
  { value: 'Asia/Dubai', label: 'Dubai', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India (IST)', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Sydney', region: 'Oceania' },
  { value: 'Australia/Melbourne', label: 'Melbourne', region: 'Oceania' },
  { value: 'Australia/Brisbane', label: 'Brisbane', region: 'Oceania' },
  { value: 'Pacific/Auckland', label: 'Auckland', region: 'Oceania' },
  { value: 'Africa/Cairo', label: 'Cairo', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi', region: 'Africa' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' },
];

interface TimezoneSelectorProps {
  userId?: string;
  currentTimezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  showAutoDetect?: boolean;
  className?: string;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  userId,
  currentTimezone,
  onTimezoneChange,
  showAutoDetect = true,
  className = ''
}) => {
  const [selectedTimezone, setSelectedTimezone] = useState<string>(currentTimezone || 'UTC');
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterRegion, setFilterRegion] = useState<string>('All');
  const { toast } = useToast();

  useEffect(() => {
    // Auto-detect user's timezone from browser
    if (showAutoDetect) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDetectedTimezone(detected);

        // If no timezone is set, use detected one
        if (!currentTimezone && detected) {
          setSelectedTimezone(detected);
        }
      } catch (error) {
        console.error('Failed to detect timezone:', error);
      }
    }
  }, [currentTimezone, showAutoDetect]);

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User ID is required to save timezone',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone: selectedTimezone })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Timezone updated successfully'
      });

      onTimezoneChange?.(selectedTimezone);
    } catch (error) {
      console.error('Error updating timezone:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update timezone',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUseDetected = () => {
    if (detectedTimezone) {
      setSelectedTimezone(detectedTimezone);
    }
  };

  const regions = ['All', ...Array.from(new Set(TIMEZONES.map(tz => tz.region)))];

  const filteredTimezones = filterRegion === 'All'
    ? TIMEZONES
    : TIMEZONES.filter(tz => tz.region === filterRegion);

  // Format current time in selected timezone
  const getCurrentTimePreview = () => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        dateStyle: 'medium',
        timeStyle: 'long'
      });
      return formatter.format(now);
    } catch (error) {
      return 'Invalid timezone';
    }
  };

  // Check for DST transitions (simplified)
  const hasDSTTransition = () => {
    try {
      const jan = new Date(2025, 0, 1);
      const jul = new Date(2025, 6, 1);

      const janOffset = new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        timeZoneName: 'short'
      }).formatToParts(jan).find(p => p.type === 'timeZoneName')?.value;

      const julOffset = new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        timeZoneName: 'short'
      }).formatToParts(jul).find(p => p.type === 'timeZoneName')?.value;

      return janOffset !== julOffset;
    } catch (error) {
      return false;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Timezone</label>

        {detectedTimezone && showAutoDetect && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="text-sm">
              <span className="font-medium">Detected: </span>
              <span className="text-blue-700 dark:text-blue-300">{detectedTimezone}</span>
            </div>
            <button
              onClick={handleUseDetected}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              Use Detected
            </button>
          </div>
        )}

        {/* Region Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {regions.map(region => (
            <button
              key={region}
              onClick={() => setFilterRegion(region)}
              className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                filterRegion === region
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Timezone Dropdown */}
        <select
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          {filteredTimezones.map(tz => (
            <option key={tz.value} value={tz.value}>
              {tz.label} ({tz.value})
            </option>
          ))}
        </select>

        {/* Current Time Preview */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Current time: </span>
          {getCurrentTimePreview()}
        </div>

        {/* DST Warning */}
        {hasDSTTransition() && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This timezone observes Daylight Saving Time (DST). Times will automatically adjust during DST transitions.
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      {userId && (
        <button
          onClick={handleSave}
          disabled={saving || selectedTimezone === currentTimezone}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Timezone'}
        </button>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>Your timezone is used to display dates and times in trip itineraries, calendar events, and notifications.</p>
        <p>For multi-timezone trips, you can set different timezones for different locations in the trip settings.</p>
      </div>
    </div>
  );
};

export default TimezoneSelector;
