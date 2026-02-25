import React, { useState } from 'react';
import { X, Upload, DollarSign, Users } from 'lucide-react';
import { Receipt, ReceiptUpload, PaymentMethod } from '../../types/receipts';
import { PaymentMethodIcon } from './PaymentMethodIcon';
import { getPaymentMethodDisplayName } from '../../utils/paymentDeeplinks';
import { useAuth } from '../../hooks/useAuth';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { AISplitHelper } from './AISplitHelper';
import { supabase } from '../../integrations/supabase/client';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptUploaded: (receipt: Receipt) => void;
  tripId: string;
}

export const ReceiptUploadModal = ({
  isOpen,
  onClose,
  onReceiptUploaded,
  tripId,
}: ReceiptUploadModalProps) => {
  const { user } = useAuth();
  const { isPlus } = useConsumerSubscription();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [currency] = useState('USD');
  const [preferredMethod, setPreferredMethod] = useState<PaymentMethod>('venmo');
  const [splitCount, setSplitCount] = useState<number | undefined>();
  const [showAISplit, setShowAISplit] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);

  const paymentMethods: PaymentMethod[] = ['venmo', 'cashapp', 'zelle', 'paypal', 'applecash'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPG, PNG, and PDF files are allowed');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setIsUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${tripId}/receipts/${fileName}`;

      let receiptUrlForAI = URL.createObjectURL(selectedFile);
      let storagePath: string | undefined;

      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trip-files')
          .upload(filePath, selectedFile, { contentType: selectedFile.type, upsert: false });

        if (!uploadError && uploadData) {
          storagePath = uploadData.path;
          // Generate a signed URL for the AI service to access the file
          const { data: signedData } = await supabase.storage
            .from('trip-files')
            .createSignedUrl(uploadData.path, 3600); // 1 hour expiry

          if (signedData) {
            receiptUrlForAI = signedData.signedUrl;
          }
        }
      } catch {
        // Upload failed - will use fallback URL handling in parser
      }

      const { data, error } = await supabase.functions.invoke('receipt-parser', {
        body: {
          receiptImageUrl: receiptUrlForAI,
          receiptPath: storagePath,
          tripId,
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data?.receipt) {
        setParsedResult(data.parsed_data);

        const newReceipt: Receipt = {
          id: data.receipt.id,
          tripId: data.receipt.trip_id,
          uploaderId: data.receipt.user_id,
          uploaderName: user.displayName || 'User',
          fileUrl: data.receipt.receipt_url,
          totalAmount: data.receipt.amount,
          currency: null,
          parsedData: undefined,
          preferredMethod,
          splitCount,
          perPersonAmount:
            splitCount && data.receipt.amount ? data.receipt.amount / splitCount : undefined,
          createdAt: data.receipt.created_at,
        };

        setTotalAmount(data.receipt.amount ? String(data.receipt.amount) : '');
        onReceiptUploaded(newReceipt);
        setSelectedFile(null);
        setSplitCount(undefined);
        onClose();
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAISplitResult = (count: number) => {
    setSplitCount(count);
    setShowAISplit(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Upload Receipt</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Receipt Image or PDF
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="text-green-400 text-sm">✓ {selectedFile.name}</div>
                    <div className="text-gray-400 text-xs">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={24} className="text-gray-400 mx-auto" />
                    <div className="text-gray-400 text-sm">
                      Click to upload JPG, PNG, or PDF (max 10MB)
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Total Amount</label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Preferred Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPreferredMethod(method)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                      preferredMethod === method
                        ? 'bg-green-500/20 border-green-500 text-green-300'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <PaymentMethodIcon method={method} size={16} />
                    <span className="text-sm font-medium">
                      {getPaymentMethodDisplayName(method)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {parsedResult && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="text-gray-300 text-sm">
                  Parsed Total: {parsedResult.total_amount ?? 'N/A'}
                </div>
                {parsedResult.merchant_name && (
                  <div className="text-gray-300 text-sm">
                    Merchant: {parsedResult.merchant_name}
                  </div>
                )}
                {parsedResult.date && (
                  <div className="text-gray-300 text-sm">Date: {parsedResult.date}</div>
                )}
              </div>
            )}

            {/* Split Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Split This Receipt
              </label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Users size={18} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        value={splitCount || ''}
                        onChange={e =>
                          setSplitCount(e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        placeholder="How many people?"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>

                  {isPlus && (
                    <button
                      type="button"
                      onClick={() => setShowAISplit(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-xl transition-colors hover:from-blue-600 hover:to-purple-600 whitespace-nowrap"
                    >
                      AI Help
                    </button>
                  )}
                </div>

                {splitCount && (totalAmount || parsedResult?.total_amount) && (
                  <div className="text-green-400 text-sm">
                    Each person owes:{' '}
                    {(
                      parseFloat(totalAmount || String(parsedResult?.total_amount || 0)) /
                      splitCount
                    ).toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl transition-colors hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload Receipt'}
            </button>
          </form>
        </div>
      </div>

      {/* AI Split Helper Modal */}
      {showAISplit && (
        <AISplitHelper
          isOpen={showAISplit}
          onClose={() => setShowAISplit(false)}
          receiptAmount={parseFloat(totalAmount || String(parsedResult?.total_amount || 0)) || 0}
          onSplitCalculated={handleAISplitResult}
        />
      )}
    </>
  );
};
