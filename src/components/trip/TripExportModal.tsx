import React, { useState, useMemo } from 'react';
import { X, Download, Loader2, FileText, Crown, Gift, Sparkles } from 'lucide-react';
import { ExportSection } from '@/types/tripExport';
import { isConsumerTrip } from '@/utils/tripTierDetector';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { usePdfExportUsage } from '@/hooks/usePdfExportUsage';
import { Badge } from '@/components/ui/badge';

interface TripExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (sections: ExportSection[]) => Promise<void>;
  tripName: string;
  tripId: string;
  tripType?: 'consumer' | 'pro' | 'event';
}

const TRIP_SECTIONS: Array<{ id: ExportSection; label: string }> = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'payments', label: 'Payments' },
  { id: 'polls', label: 'Polls' },
  { id: 'places', label: 'Places' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'broadcasts', label: 'Broadcast Log' },
  { id: 'roster', label: 'Roster' },
];

const EVENT_SECTIONS: Array<{ id: ExportSection; label: string }> = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'broadcasts', label: 'Broadcasts' },
  { id: 'lineup', label: 'Lineup' },
  { id: 'polls', label: 'Polls' },
  { id: 'tasks', label: 'Tasks' },
];

export const TripExportModal: React.FC<TripExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  tripName,
  tripId,
  tripType,
}) => {
  const isConsumer = isConsumerTrip(tripId);
  const { upgradeToTier, isLoading: isUpgrading } = useConsumerSubscription();
  const { usage, recordExport, getUsageStatus, isPaidUser, canExport } = usePdfExportUsage(tripId);

  const isEvent = tripType === 'event';
  const sections = isEvent ? EVENT_SECTIONS : TRIP_SECTIONS;

  // Free users get 1 export per trip, paid users get unlimited
  const hasExportAccess = isPaidUser || canExport;

  const [selectedSections, setSelectedSections] = useState<ExportSection[]>(
    sections.map(s => s.id),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (sectionId: ExportSection) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      setError('Please select at least one section for your recap');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      await onExport(selectedSections);
      // Record the export for free users
      if (!isPaidUser) {
        recordExport();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip recap');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Free users: 1 export per trip, Paid users: unlimited
  const hasAccess = hasExportAccess;
  const usageStatus = getUsageStatus();
  const showFreeExportBanner = !isPaidUser && canExport;
  const showUpgradePrompt = !isPaidUser && !canExport;

  const headerTitle = isEvent ? 'Create Event Recap' : 'Create Trip Recap';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-2">
      <div className="bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] sm:max-h-[85vh] border border-gray-700 flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0"
          style={{ paddingTop: 'max(12px, calc(env(safe-area-inset-top, 0px) + 12px))' }}
        >
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FileText size={16} />
            </div>
            <h2 className="text-base font-bold text-white">{headerTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            disabled={isExporting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-3 overflow-y-auto flex-1"
          style={
            !hasAccess
              ? { paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }
              : undefined
          }
        >
          {/* Upgrade prompt when free export is used */}
          {showUpgradePrompt ? (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={18} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Upgrade for Unlimited Exports</h3>
              </div>
              <p className="text-gray-300 text-xs mb-3">
                You've used your free export for this trip. Upgrade to create unlimited PDF recaps
                and share your adventures with everyone!
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => upgradeToTier('explorer', 'monthly')}
                  disabled={isUpgrading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2.5 text-sm rounded-lg transition-all disabled:opacity-50 min-h-[44px]"
                >
                  {isUpgrading ? 'Processing...' : 'Explorer $9.99/mo'}
                </button>
                <button
                  onClick={() => upgradeToTier('frequent-chraveler', 'monthly')}
                  disabled={isUpgrading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 py-2.5 text-sm rounded-lg transition-all disabled:opacity-50 min-h-[44px]"
                >
                  {isUpgrading ? 'Processing...' : 'Frequent Chraveler $19.99/mo'}
                </button>
              </div>
              <p className="text-gray-400 text-[10px] mt-2 text-center">
                💡 Tip: Check your sent messages for the PDF you already exported
              </p>
            </div>
          ) : (
            <>
              {/* Free export banner for free users */}
              {showFreeExportBanner && (
                <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-lg py-1 px-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <Gift size={12} className="text-green-400" />
                    <div className="flex-1">
                      <span className="text-green-300 text-[10px] font-medium">1 Free Export</span>
                      <span className="text-green-400/70 text-[9px] ml-1">per trip</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-300 text-[9px] py-0 px-1.5 h-5"
                    >
                      Sample it!
                    </Badge>
                  </div>
                </div>
              )}

              {/* Unlimited badge for paid users */}
              {isPaidUser && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className="bg-purple-500/20 text-purple-300 text-[10px]"
                  >
                    <Sparkles size={10} className="mr-1" />
                    Unlimited Exports
                  </Badge>
                </div>
              )}

              <div className="mb-2">
                <h3 className="text-white font-semibold text-xs mb-0.5">
                  {isEvent ? 'Event' : 'Trip'}: {tripName}
                </h3>
                <p className="text-gray-400 text-[10px]">
                  Select sections to include in your recap
                </p>
              </div>

              {/* Section Selection */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {sections.map(section => (
                  <label
                    key={section.id}
                    className={`flex items-center gap-1.5 py-2 px-2.5 rounded-lg border transition-all h-10 ${
                      selectedSections.includes(section.id)
                        ? 'bg-blue-900/30 border-blue-500 cursor-pointer hover:border-blue-400'
                        : 'bg-gray-800 border-gray-700 cursor-pointer hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                      className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 flex-shrink-0"
                    />
                    <span className="text-[11px] font-medium truncate text-white">
                      {section.label}
                    </span>
                  </label>
                ))}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-1.5 mb-2">
                  <p className="text-red-200 text-[10px]">{error}</p>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-1.5">
                <p className="text-gray-300 text-[10px]">
                  <strong>🔒</strong> Emails and phone numbers hidden. Chat and AI history never
                  included.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer - Always visible with safe area padding for PWA/mobile */}
        {hasAccess && (
          <div
            className="flex items-center justify-end gap-2 p-3 border-t border-gray-700 flex-shrink-0 bg-gray-900"
            style={{ paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }}
          >
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 text-sm rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedSections.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Create Recap
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
