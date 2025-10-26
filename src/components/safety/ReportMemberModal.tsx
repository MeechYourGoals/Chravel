import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../ui/use-toast';
import { X } from 'lucide-react';

interface ReportMemberModalProps {
  tripId: string;
  reportedUserId: string;
  reportedUserName: string;
  reporterUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or Unwanted Content', description: 'Posting irrelevant or repetitive content' },
  { value: 'harassment', label: 'Harassment or Bullying', description: 'Offensive or threatening behavior' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Sharing inappropriate images or messages' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' }
];

export const ReportMemberModal: React.FC<ReportMemberModalProps> = ({
  tripId,
  reportedUserId,
  reportedUserName,
  reporterUserId,
  isOpen,
  onClose,
  onReportSubmitted
}) => {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please select a reason for reporting',
        variant: 'destructive'
      });
      return;
    }

    if (reason === 'other' && !description.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide details for "Other" reason',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Submit report to database
      const { error } = await supabase
        .from('member_reports')
        .insert({
          trip_id: tripId,
          reported_user_id: reportedUserId,
          reporter_user_id: reporterUserId,
          reason,
          description: description.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: 'Thank you for reporting. Our team will review this shortly.'
      });

      // Reset form
      setReason('');
      setDescription('');
      onReportSubmitted?.();
      onClose();

    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Report Member
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are reporting: <span className="font-medium text-gray-900 dark:text-white">{reportedUserName}</span>
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason for Report *
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reasonOption) => (
                <label
                  key={reasonOption.value}
                  className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    reason === reasonOption.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reasonOption.value}
                    checked={reason === reasonOption.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {reasonOption.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {reasonOption.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Details {reason === 'other' && '*'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Provide any additional context or specific examples..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description.length}/500 characters
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              False reports may result in action against your account. Only submit genuine reports.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason || (reason === 'other' && !description.trim())}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportMemberModal;
