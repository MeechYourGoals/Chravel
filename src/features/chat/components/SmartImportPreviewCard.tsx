import React, { useState, useCallback } from 'react';
import {
  CalendarPlus,
  Plane,
  Hotel,
  UtensilsCrossed,
  Music,
  MapPin,
  Clock,
  AlertTriangle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { SmartImportPreviewEvent } from '@/services/conciergeGateway';

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  transportation: { icon: Plane, label: 'Transportation', color: 'sky' },
  lodging: { icon: Hotel, label: 'Lodging', color: 'amber' },
  dining: { icon: UtensilsCrossed, label: 'Dining', color: 'orange' },
  activity: { icon: MapPin, label: 'Activity', color: 'green' },
  entertainment: { icon: Music, label: 'Entertainment', color: 'purple' },
  other: { icon: CalendarPlus, label: 'Event', color: 'blue' },
};

const COLOR_CLASSES: Record<string, string> = {
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  orange: 'text-orange-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  blue: 'text-blue-400',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface SmartImportPreviewCardProps {
  previewEvents: SmartImportPreviewEvent[];
  tripId: string;
  totalEvents: number;
  duplicateCount: number;
  /** If a lodging event was detected, include hotel name for basecamp prompt */
  lodgingName?: string;
  onConfirm: (events: SmartImportPreviewEvent[]) => void;
  onDismiss: () => void;
  isImporting?: boolean;
  importResult?: { imported: number; failed: number } | null;
}

export const SmartImportPreviewCard: React.FC<SmartImportPreviewCardProps> = ({
  previewEvents,
  totalEvents,
  duplicateCount,
  lodgingName,
  onConfirm,
  onDismiss,
  isImporting = false,
  importResult = null,
}) => {
  const [deselected, setDeselected] = useState<Set<number>>(
    () => new Set(previewEvents.map((e, i) => (e.isDuplicate ? i : -1)).filter(i => i >= 0)),
  );

  const toggleEvent = useCallback((index: number) => {
    setDeselected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectedEvents = previewEvents.filter((_, i) => !deselected.has(i));

  const handleConfirm = useCallback(() => {
    if (selectedEvents.length === 0) return;
    onConfirm(selectedEvents);
  }, [selectedEvents, onConfirm]);

  // Show success state
  if (importResult) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Check size={18} className="text-green-400" />
          <p className="text-sm font-medium text-green-300">
            Added {importResult.imported} event{importResult.imported !== 1 ? 's' : ''} to Calendar
          </p>
        </div>
        {importResult.failed > 0 && (
          <p className="text-xs text-red-400">
            {importResult.failed} event{importResult.failed !== 1 ? 's' : ''} failed to import
          </p>
        )}
        {lodgingName && importResult.imported > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-green-500/20">
            <Hotel size={14} className="text-amber-400 shrink-0" />
            <p className="text-xs text-gray-300">
              Tip: Say{' '}
              <span className="text-amber-300 font-medium">"Make {lodgingName} the basecamp"</span>{' '}
              to set it as your trip base.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <CalendarPlus size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-blue-300">Smart Import Preview</span>
          <span className="text-xs text-gray-500">
            {totalEvents} event{totalEvents !== 1 ? 's' : ''} found
          </span>
        </div>
        {!isImporting && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Dismiss import preview"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Duplicate warning */}
      {duplicateCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-white/5">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300">
            {duplicateCount} event{duplicateCount !== 1 ? 's' : ''} already in your calendar
            (deselected)
          </span>
        </div>
      )}

      {/* Event list */}
      <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
        {previewEvents.map((event, index) => {
          const isSelected = !deselected.has(index);
          const catConfig = CATEGORY_CONFIG[event.category || 'other'] || CATEGORY_CONFIG.other;
          const Icon = catConfig.icon;
          const colorClass = COLOR_CLASSES[catConfig.color] || COLOR_CLASSES.blue;

          return (
            <button
              key={index}
              type="button"
              onClick={() => !isImporting && toggleEvent(index)}
              disabled={isImporting}
              className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                isSelected ? 'hover:bg-white/5' : 'opacity-40 hover:opacity-60'
              } disabled:cursor-not-allowed`}
            >
              {/* Checkbox */}
              <div
                className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-transparent'
                }`}
              >
                {isSelected && <Check size={10} className="text-white" />}
              </div>

              {/* Icon */}
              <Icon size={14} className={`mt-0.5 shrink-0 ${colorClass}`} />

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium truncate ${
                    event.isDuplicate ? 'line-through text-gray-500' : 'text-white'
                  }`}
                >
                  {event.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={10} />
                    {formatDateTime(event.startTime)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                      <MapPin size={10} />
                      {event.location}
                    </span>
                  )}
                </div>
                {event.notes && (
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">{event.notes}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02]">
        <span className="text-xs text-gray-500">
          {selectedEvents.length} of {totalEvents} selected
        </span>
        <div className="flex items-center gap-2">
          {!isImporting && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedEvents.length === 0 || isImporting}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isImporting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CalendarPlus size={12} />
                Add to Calendar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
