
import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { Receipt } from '../../types/receipts';
import { PaymentMethodIcon } from './PaymentMethodIcon';
import { generatePaymentDeeplink, getPaymentMethodDisplayName } from '../../utils/paymentDeeplinks';

interface ReceiptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
}

export const ReceiptViewModal = ({ isOpen, onClose, receipt }: ReceiptViewModalProps) => {
  if (!isOpen) return null;

  const handlePaymentClick = () => {
    const deeplink = generatePaymentDeeplink(
      receipt.preferredMethod,
      receipt.perPersonAmount || receipt.totalAmount,
      receipt.uploaderName
    );
    
    if (deeplink) {
      window.open(deeplink, '_blank');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = receipt.fileUrl;
    link.download = receipt.fileUrl.split('/').pop() || 'receipt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = !receipt.fileUrl.split('?')[0].toLowerCase().endsWith('.pdf');
  const fileName = receipt.fileUrl.split('?')[0].split('/').pop() || 'Receipt';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">{fileName}</h3>
            {receipt.uploaderName && (
              <p className="text-gray-400 text-sm">Uploaded by {receipt.uploaderName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Receipt Preview */}
          <div className="mb-6">
            {isImage ? (
              <img
                src={receipt.fileUrl}
                alt={fileName}
                className="w-full max-h-80 object-contain rounded-xl bg-gray-800"
              />
            ) : (
              <div className="w-full h-80 bg-gray-800 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <ExternalLink size={24} className="text-red-400" />
                  </div>
                  <p className="text-gray-400 mb-4">PDF Preview Not Available</p>
                  <button
                    onClick={handleDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Download to View
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Receipt Details */}
          <div className="bg-white/5 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">Total Amount</label>
                <div className="text-white font-semibold text-lg">
                  ${receipt.totalAmount ? receipt.totalAmount.toFixed(2) : '0.00'} {receipt.currency || ''}
                </div>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Payment Method</label>
                <div className="flex items-center gap-2 mt-1">
                  <PaymentMethodIcon method={receipt.preferredMethod} size={16} />
                  <span className="text-white">
                    {getPaymentMethodDisplayName(receipt.preferredMethod)}
                  </span>
                </div>
              </div>
            </div>

            {receipt.splitCount && receipt.perPersonAmount && (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-gray-400 text-sm">Split Details</label>
                    <div className="text-white">
                      ${receipt.perPersonAmount.toFixed(2)} each ({receipt.splitCount} people)
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePaymentClick}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-xl transition-colors flex items-center gap-2 hover:from-green-600 hover:to-emerald-600"
                  >
                    Pay ${receipt.perPersonAmount.toFixed(2)}
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
