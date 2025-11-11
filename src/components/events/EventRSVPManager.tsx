/**
 * Event RSVP Manager Component
 * 
 * Provides UI for attendees to RSVP to events with:
 * - RSVP status selection (going, maybe, not-going)
 * - Capacity limit display and enforcement
 * - Waitlist management
 * - QR code ticket generation
 * 
 * Used in: EventDetailContent for attendee registration flow
 */

import React, { useState } from 'react';
import { useEventRSVP } from '@/hooks/useEventRSVP';
import { RSVPStatus } from '@/types/events';
import { CheckCircle2, Clock, XCircle, Users, AlertCircle, QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
// QR Code generation - requires qrcode package: npm install qrcode @types/qrcode
// For now, using dynamic import to handle missing package gracefully
let QRCode: any = null;
try {
  // @ts-ignore - Dynamic import for optional dependency
  QRCode = require('qrcode');
} catch {
  // QR code library not installed - will show fallback UI
  console.warn('QR code library not installed. Install with: npm install qrcode @types/qrcode');
}

interface EventRSVPManagerProps {
  eventId: string;
  eventTitle: string;
  eventCapacity?: number;
  registrationStatus?: 'open' | 'closed' | 'waitlist';
}

export const EventRSVPManager: React.FC<EventRSVPManagerProps> = ({
  eventId,
  eventTitle,
  eventCapacity,
  registrationStatus = 'open'
}) => {
  const { rsvp, capacity, isLoading, isSubmitting, submitRSVP } = useEventRSVP(eventId);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Generate QR code image from ticket data
  const generateQRCodeImage = async (qrData: string) => {
    if (!QRCode) {
      // Fallback: Show QR data as text if library not available
      alert('QR code library not installed. Please install qrcode package.');
      return;
    }
    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  // Handle RSVP submission
  const handleRSVP = async (status: RSVPStatus) => {
    const success = await submitRSVP(status);
    if (success && status === 'going' && rsvp?.ticketQrCode) {
      await generateQRCodeImage(rsvp.ticketQrCode);
      setShowQRCode(true);
    }
  };

  // Download QR code
  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `${eventTitle}-ticket.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <LoadingSpinner className="mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const currentStatus = rsvp?.status || 'not-answered';
  const isRegistrationClosed = registrationStatus === 'closed';
  const isWaitlistOnly = registrationStatus === 'waitlist' || (capacity?.isFull && capacity.isWaitlistEnabled);

  return (
    <div className="space-y-4">
      {/* Capacity Display */}
      {capacity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Event Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Registered</span>
                <span className="font-semibold text-white">
                  {capacity.current} / {capacity.total || '∞'}
                </span>
              </div>
              {capacity.total && (
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (capacity.current / capacity.total) * 100)}%` }}
                  />
                </div>
              )}
              {capacity.isFull && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Event Full</AlertTitle>
                  <AlertDescription>
                    {capacity.isWaitlistEnabled
                      ? `This event is at capacity. ${capacity.waitlistCount} people on waitlist.`
                      : 'This event is at full capacity.'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RSVP Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>RSVP to {eventTitle}</CardTitle>
          <CardDescription>
            {isRegistrationClosed
              ? 'Registration is closed for this event.'
              : isWaitlistOnly
              ? 'Event is full. Join the waitlist to be notified if spots become available.'
              : 'Let us know if you\'ll be attending!'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status Display */}
          {rsvp && (
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
              {currentStatus === 'going' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {currentStatus === 'maybe' && <Clock className="h-5 w-5 text-yellow-500" />}
              {currentStatus === 'not-going' && <XCircle className="h-5 w-5 text-red-500" />}
              <span className="text-sm text-gray-300">
                Your RSVP: <span className="font-semibold text-white capitalize">{currentStatus.replace('-', ' ')}</span>
                {rsvp.waitlistPosition && (
                  <span className="ml-2 text-yellow-500">
                    (Waitlist position: #{rsvp.waitlistPosition})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* RSVP Buttons */}
          {!isRegistrationClosed && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={currentStatus === 'going' ? 'default' : 'outline'}
                onClick={() => handleRSVP('going')}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs">Going</span>
              </Button>
              <Button
                variant={currentStatus === 'maybe' ? 'default' : 'outline'}
                onClick={() => handleRSVP('maybe')}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <Clock className="h-5 w-5" />
                <span className="text-xs">Maybe</span>
              </Button>
              <Button
                variant={currentStatus === 'not-going' ? 'default' : 'outline'}
                onClick={() => handleRSVP('not-going')}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <XCircle className="h-5 w-5" />
                <span className="text-xs">Can't Go</span>
              </Button>
            </div>
          )}

          {/* QR Code Ticket */}
          {rsvp?.ticketQrCode && currentStatus === 'going' && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Your Ticket
                </CardTitle>
                <CardDescription>Present this QR code at check-in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrCodeUrl ? (
                  <>
                    <div className="flex justify-center">
                      <img src={qrCodeUrl} alt="Ticket QR Code" className="w-64 h-64 border-2 border-white/20 rounded-lg" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={downloadQRCode}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Ticket
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => generateQRCodeImage(rsvp.ticketQrCode!)}
                    className="w-full"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
