/**
 * SmartImportPreviewCard
 *
 * Renders extracted calendar items from a screenshot/PDF/text inside the
 * AI Concierge chat. Users can select/deselect items and confirm to add
 * them to the trip calendar.
 */

import React, { useState, useCallback } from 'react';
import {
  CalendarPlus,
  Plane,
  Hotel,
  UtensilsCrossed,
  Car,
  Train,
  MapPin,
  Clock,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';
import type { ExtractedCalendarItem, ExtractedItemKind } from '@/utils/conciergeSmartImport';

const KIND_CONFIG: Record<
  ExtractedItemKind,
  { icon: React.ElementType; label: string; color: string }
> = {
  flight: { icon: Plane, label: 'Flight', color: 'text-blue-400' },
  hotel: { icon: Hotel, label: 'Hotel', color: 'text-purple-400' },
  restaurant: { icon: UtensilsCrossed, label: 'Dining', color: 'text-orange-400' },
  car: { icon: Car, label: 'Car', color: 'text-green-400' },
  train: { icon: Train, label: 'Train', color: 'text-teal-400' },
  event: { icon: CalendarPlus, label: 'Event', color: 'text-indigo-400' },
  other: { icon: MapPin, label: 'Other', color: 'text-gray-400' },
};

interface SmartImportPreviewCardProps {
  items: ExtractedCalendarItem[];
  onConfirm: (selectedItems: ExtractedCalendarItem[]) => void;
  isImporting: boolean;
  importResult?: { imported: number; failed: number } | null;
}

export const SmartImportPreviewCard: React.FC<SmartImportPreviewCardProps> = ({
  items,
  onConfirm,
  isImporting,
  importResult,
}) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map(i => i.id)));

  const toggleItem = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map(i => i.id));
    });
  }, [items]);

  const handleConfirm = useCallback(() => {
    const selectedItems = items.filter(i => selected.has(i.id));
    onConfirm(selectedItems);
  }, [items, selected, onConfirm]);

  const formatDatetime = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // Group items by date
  const groupedByDate = items.reduce<Record<string, ExtractedCalendarItem[]>>((acc, item) => {
    const dateKey = new Date(item.startDatetime).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Success state
  if (importResult) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <Check size={18} className="text-green-400" />
          <span className="font-medium text-green-300 text-sm">
            Added {importResult.imported} event{importResult.imported !== 1 ? 's' : ''} to Calendar
          </span>
        </div>
        {importResult.failed > 0 && (
          <p className="text-xs text-red-400 mt-1">
            {importResult.failed} item{importResult.failed !== 1 ? 's' : ''} failed to import
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm max-w-sm w-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarPlus size={16} className="text-blue-400" />
          <span className="font-medium text-white text-sm">
            {items.length} event{items.length !== 1 ? 's' : ''} found
          </span>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {selected.size === items.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Items grouped by date */}
      <div className="max-h-64 overflow-y-auto">
        {Object.entries(groupedByDate).map(([dateLabel, dateItems]) => (
          <div key={dateLabel}>
            <div className="px-4 py-1.5 bg-white/5 text-xs font-medium text-gray-400 sticky top-0">
              {dateLabel}
            </div>
            {dateItems.map(item => {
              const config = KIND_CONFIG[item.kind] || KIND_CONFIG.other;
              const Icon = config.icon;
              const isSelected = selected.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-500/10 hover:bg-blue-500/15'
                      : 'opacity-50 hover:opacity-70'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/30 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>

                  {/* Icon */}
                  <Icon size={16} className={`mt-0.5 shrink-0 ${config.color}`} />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={10} className="text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-400 truncate">
                        {formatDatetime(item.startDatetime)}
                      </span>
                    </div>
                    {item.locationName && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin size={10} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-400 truncate">{item.locationName}</span>
                      </div>
                    )}
                    {item.warnings.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={10} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-400 truncate">{item.warnings[0]}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected.size === 0 || isImporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isImporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <CalendarPlus size={14} />
              Add {selected.size} to Calendar
            </>
          )}
        </button>
      </div>
    </div>
  );
};
