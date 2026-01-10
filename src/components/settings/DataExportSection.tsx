/**
 * Data Export Section
 * GDPR-compliant data export UI for downloading user data
 */

import React, { useState } from 'react';
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  FileJson,
  HelpCircle,
} from 'lucide-react';
import { useDataExport } from '@/hooks/useDataExport';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';

interface DataExportSectionProps {
  className?: string;
}

// List of data categories included in the export
const DATA_CATEGORIES = [
  { name: 'Profile Information', description: 'Your name, email, avatar, and account settings' },
  {
    name: 'Trip Data',
    description: 'Trips you created or joined, including itineraries and events',
  },
  { name: 'Messages', description: 'Chat messages and communications you sent' },
  { name: 'Tasks & Polls', description: 'Tasks you created or were assigned, and poll responses' },
  { name: 'Payments', description: 'Payment records, expense splits, and receipts' },
  { name: 'Media Files', description: 'Links to files and photos you uploaded (with signed URLs)' },
  {
    name: 'Preferences',
    description: 'Notification settings, privacy preferences, and app settings',
  },
  { name: 'AI Interactions', description: 'Your AI concierge queries and saved recommendations' },
];

export const DataExportSection: React.FC<DataExportSectionProps> = ({ className }) => {
  const { toast } = useToast();
  const { showDemoContent } = useDemoMode();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const { status, result, error, isExporting, requestExport, downloadExport, reset } =
    useDataExport();

  const handleExportRequest = async () => {
    if (showDemoContent) {
      toast({
        title: 'Demo Mode',
        description:
          'Data export is not available in demo mode. Please log in to export your data.',
        variant: 'default',
      });
      return;
    }

    const exportResult = await requestExport();

    if (exportResult?.success && exportResult.downloadUrl) {
      toast({
        title: 'Export Ready',
        description: 'Your data export is ready for download.',
      });
    }
  };

  const handleDownload = () => {
    if (result?.downloadUrl && result?.filename) {
      downloadExport(result.downloadUrl, result.filename);
      toast({
        title: 'Download Started',
        description: 'Your data export is downloading.',
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatExpiryTime = (isoDate: string): string => {
    const expiry = new Date(isoDate);
    return expiry.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={className}>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <FileJson className="h-5 w-5 text-glass-orange" />
              Export Your Data
            </h4>
            <p className="text-sm text-gray-400 mt-1">
              Download a copy of all your personal data in JSON format
            </p>
          </div>
          <button
            onClick={() => setShowInfoDialog(true)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Learn more about data export"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Status Display */}
        {status === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Your export will include all your personal data, trip memberships, messages, and
              preferences. The download link will be valid for 1 hour.
            </p>
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full bg-glass-orange hover:bg-glass-orange/90"
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Export Your Data</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This will create a JSON file containing all your personal data from Chravel. The
                    export includes:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 max-h-48 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-2">
                    {DATA_CATEGORIES.map(category => (
                      <li key={category.name} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{category.name}</span>
                          <span className="text-gray-500"> - {category.description}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-gray-500">
                  Note: You can only request one export per day. The download link expires after 1
                  hour.
                </p>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExportRequest}
                    className="bg-glass-orange hover:bg-glass-orange/90"
                  >
                    Start Export
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            <div>
              <p className="text-white font-medium">Preparing your export...</p>
              <p className="text-sm text-gray-400">This may take a few moments</p>
            </div>
          </div>
        )}

        {status === 'success' && result && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-medium">Export Ready!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your data has been compiled and is ready for download.
                </p>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>Records exported: {result.totalRecords?.toLocaleString()}</p>
                  <p>
                    File size:{' '}
                    {result.fileSizeBytes ? formatFileSize(result.fileSizeBytes) : 'Unknown'}
                  </p>
                  <p>Tables included: {result.tablesExported}</p>
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires at: {result.expiresAt ? formatExpiryTime(result.expiresAt) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="flex-1 bg-glass-orange hover:bg-glass-orange/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Download ({result.filename})
              </Button>
              <Button
                onClick={reset}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Export Failed</p>
                <p className="text-sm text-gray-400 mt-1">{error.message || error.error}</p>
              </div>
            </div>
            <Button
              onClick={reset}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          </div>
        )}

        {status === 'rate_limited' && error && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Export Limit Reached</p>
                <p className="text-sm text-gray-400 mt-1">
                  {error.message ||
                    'You can only export your data once per day. Please try again tomorrow.'}
                </p>
              </div>
            </div>
            <Button
              onClick={reset}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Info Dialog */}
      <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <AlertDialogContent className="bg-gray-900 border-white/10 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">About Data Export</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-gray-400 space-y-3">
                <p>
                  Under GDPR (General Data Protection Regulation), you have the right to receive a
                  copy of your personal data in a portable format.
                </p>
                <p>Your export includes all personal information stored in Chravel:</p>
                <ul className="text-sm space-y-1 pl-4">
                  {DATA_CATEGORIES.map(cat => (
                    <li key={cat.name} className="list-disc">
                      {cat.name}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500">
                  The export is provided as a JSON file that can be opened with any text editor or
                  imported into other applications. Media files are provided as temporary signed
                  URLs that expire after 1 hour.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-glass-orange hover:bg-glass-orange/90">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
