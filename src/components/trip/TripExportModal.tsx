import React, { useState } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { ExportSection } from '@/types/tripExport';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { useDemoMode } from '@/hooks/useDemoMode';

interface TripExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (sections: ExportSection[]) => Promise<void>;
  tripName: string;
}

export const TripExportModal: React.FC<TripExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  tripName,
}) => {
  const { tier } = useConsumerSubscription();
  const { isDemoMode } = useDemoMode();
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
    { id: 'calendar' as ExportSection, label: 'Calendar', icon: '🗓', description: 'Events and itinerary' },
    { id: 'payments' as ExportSection, label: 'Payments', icon: '💸', description: 'Expenses and splits' },
    { id: 'polls' as ExportSection, label: 'Polls', icon: '📊', description: 'Voting results' },
    { id: 'places' as ExportSection, label: 'Places', icon: '📍', description: 'Saved locations' },
    { id: 'tasks' as ExportSection, label: 'Tasks', icon: '✅', description: 'To-do items' },
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

  // Check if user has access to PDF export feature
  const hasAccess = isDemoMode || tier === 'frequent-chraveler';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Trip Summary</h2>
              <p className="text-sm text-gray-400">Create a PDF summary of your trip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isExporting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasAccess ? (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Upgrade Required</h3>
              <p className="text-gray-300 mb-4">
                PDF Export is available for Frequent Chraveler and Enterprise tiers.
              </p>
              <button
                onClick={() => {
                  // Navigate to pricing page
                  window.location.href = '/pricing';
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                Upgrade Now
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-2">Trip: {tripName}</h3>
                <p className="text-gray-400 text-sm">
                  Select the sections you'd like to include in your PDF export
                </p>
              </div>

              {/* Section Selection */}
              <div className="space-y-3 mb-6">
                {sections.map((section) => (
                  <label
                    key={section.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedSections.includes(section.id)
                        ? 'bg-blue-900/30 border-blue-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                      className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{section.icon}</span>
                        <span className="text-white font-medium">{section.label}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{section.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
                <p className="text-gray-300 text-sm">
                  <strong>Note:</strong> Chat messages and AI Concierge history are never included in exports for privacy.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {hasAccess && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-6 py-2 rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedSections.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Export PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
