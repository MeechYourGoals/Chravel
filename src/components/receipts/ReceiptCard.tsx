import React, { useState, useEffect } from 'react';
import { FileText, Eye, ExternalLink, Users, DollarSign } from 'lucide-react';
import { Receipt } from '../../types/receipts';
import { PaymentMethodIcon } from './PaymentMethodIcon';
import { generatePaymentDeeplink } from '../../utils/paymentDeeplinks';
import { ReceiptViewModal } from './ReceiptViewModal';
import { supabase } from '../../integrations/supabase/client';

interface ReceiptCardProps {
  receipt: Receipt;
}

export const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(receipt.fileUrl);

  useEffect(() => {
    let isMounted = true;

    const fetchSignedUrl = async () => {
      // If it looks like a path (no http scheme), it's a relative storage path
      if (receipt.fileUrl && !receipt.fileUrl.startsWith('http')) {
        const { data } = await supabase.storage
          .from('trip-files')
          .createSignedUrl(receipt.fileUrl, 3600); // 1 hour expiry

        if (isMounted && data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
      }
      // Handle legacy public Supabase URLs - extract path and sign it
      else if (
        receipt.fileUrl &&
        receipt.fileUrl.includes('/storage/v1/object/public/trip-files/')
      ) {
        try {
          const path = receipt.fileUrl.split('/storage/v1/object/public/trip-files/')[1];
          if (path) {
            const { data } = await supabase.storage.from('trip-files').createSignedUrl(path, 3600);

            if (isMounted && data?.signedUrl) {
              setImageUrl(data.signedUrl);
            }
          }
        } catch (e) {
          console.error('Error parsing legacy URL', e);
        }
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [receipt.fileUrl]);

  const handlePaymentClick = () => {
    const deeplink = generatePaymentDeeplink(
      receipt.preferredMethod,
      receipt.perPersonAmount || receipt.totalAmount,
      receipt.uploaderName,
    );

    if (deeplink) {
      window.open(deeplink, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPDF = receipt.fileUrl.toLowerCase().endsWith('.pdf');
  const isImage = !isPDF;
  const fileName = receipt.fileUrl.split('/').pop()?.split('?')[0] || 'Receipt';

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {isImage ? (
              <img
                src={imageUrl}
                alt={fileName}
                className="w-16 h-16 rounded-lg object-cover cursor-pointer"
                onClick={() => setShowViewModal(true)}
              />
            ) : (
              <div
                className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={() => setShowViewModal(true)}
              >
                <FileText size={24} className="text-red-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-white font-medium truncate">{fileName}</h4>
                {receipt.uploaderName && (
                  <p className="text-gray-400 text-sm">Uploaded by {receipt.uploaderName}</p>
                )}
              </div>
              <button
                onClick={() => setShowViewModal(true)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <Eye size={16} />
              </button>
            </div>

            {/* Amount and Split Info */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1">
                <DollarSign size={16} className="text-green-400" />
                <span className="text-white font-medium">
                  ${receipt.totalAmount ? receipt.totalAmount.toFixed(2) : '0.00'}
                </span>
              </div>

              {receipt.splitCount && receipt.perPersonAmount && (
                <div className="flex items-center gap-1">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-gray-300 text-sm">
                    ${receipt.perPersonAmount.toFixed(2)} each ({receipt.splitCount} people)
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method and Action */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PaymentMethodIcon method={receipt.preferredMethod} size={16} />
                <span className="text-gray-300 text-sm capitalize">{receipt.preferredMethod}</span>
                <span className="text-gray-500 text-sm">•</span>
                <span className="text-gray-500 text-sm">{formatDate(receipt.createdAt)}</span>
              </div>

              {receipt.perPersonAmount && (
                <button
                  onClick={handlePaymentClick}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:from-green-600 hover:to-emerald-600 transition-colors"
                >
                  Pay ${receipt.perPersonAmount.toFixed(2)}
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReceiptViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        receipt={{ ...receipt, fileUrl: imageUrl }}
      />
    </>
  );
};
