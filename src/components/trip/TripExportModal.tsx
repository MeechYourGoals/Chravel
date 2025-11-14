import React, { useState } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { ExportSection } from '@/types/tripExport';
import { isConsumerTrip } from '@/utils/tripTierDetector';

interface TripExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (sections: ExportSection[]) => Promise<void>;
  tripName: string;
  tripId: string;
}

export const TripExportModal: React.FC<TripExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  tripName,
  tripId,
}) => {
  const isConsumer = isConsumerTrip(tripId);
  
  const [selectedSections, setSelectedSections] = useState<ExportSection[]>([
    'calendar',
    'payments',
    'polls',
    'places',
    'tasks',
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = [
    { id: 'calendar' as ExportSection, label: 'Calendar', icon: '📅' },
    { id: 'payments' as ExportSection, label: 'Payments', icon: '💰' },
    { id: 'polls' as ExportSection, label: 'Polls', icon: '📊' },
    { id: 'places' as ExportSection, label: 'Places', icon: '📍' },
    { id: 'tasks' as ExportSection, label: 'Tasks', icon: '✅' },
    { id: 'broadcasts' as ExportSection, label: 'Broadcast Log', icon: '📢', proOnly: true },
    { id: 'roster' as ExportSection, label: 'Roster & Contacts', icon: '👥', proOnly: true },
    { id: 'attachments' as ExportSection, label: 'Attachments', icon: '📎', proOnly: true },
  ];

  const toggleSection = (sectionId: ExportSection) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      setError('Please select at least one section to export');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      await onExport(selectedSections);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export trip summary');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Export is now available to everyone
  const hasAccess = true;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[600px] border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Export Trip Summary</h2>
              <p className="text-xs text-gray-400">Create a PDF summary of your trip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isExporting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {!hasAccess ? (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-4 mb-4">
              <h3 className="text-base font-semibold text-white mb-2">Upgrade Required</h3>
              <p className="text-gray-300 text-sm mb-3">
                PDF Export is available for Frequent Chraveler and Enterprise tiers.
              </p>
              <button
                onClick={() => {
                  // Navigate to pricing page
                  window.location.href = '/pricing';
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 text-sm rounded-lg transition-all"
              >
                Upgrade Now
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <h3 className="text-white font-semibold text-sm mb-1">Trip: {tripName}</h3>
                <p className="text-gray-400 text-xs">
                  Select the sections you'd like to include in your PDF export
                </p>
              </div>

              {/* Section Selection */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {sections.map((section) => {
                  const disabled = section.proOnly && isConsumer;
                  
                  return (
                    <label
                      key={section.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        disabled
                          ? 'bg-gray-800/50 border-gray-700/50 opacity-50 cursor-not-allowed'
                          : selectedSections.includes(section.id)
                          ? 'bg-blue-900/30 border-blue-500 cursor-pointer hover:border-blue-400'
                          : 'bg-gray-800 border-gray-700 cursor-pointer hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.id) && !disabled}
                        onChange={() => !disabled && toggleSection(section.id)}
                        disabled={disabled}
                        className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium flex items-center gap-1.5">
                          <span>{section.icon}</span>
                          <span className="truncate">{section.label}</span>
                        </div>
                        {disabled && (
                          <div className="text-[10px] text-gray-500">Pro trips only</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2 mb-2">
                  <p className="text-red-200 text-xs">{error}</p>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2">
                <p className="text-gray-300 text-xs">
                  <strong>🔒 Privacy Protected:</strong> Emails and phone numbers are automatically hidden in all exports. Chat messages and AI Concierge history are never included.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {hasAccess && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedSections.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
