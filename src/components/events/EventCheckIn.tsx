/**
 * Event Check-In Component
 * 
 * Provides check-in functionality for event organizers:
 * - QR code scanner for ticket verification
 * - Manual check-in by attendee name/email
 * - Check-in status display
 * - Real-time check-in count
 * 
 * Used by: Event organizers/admins for attendee check-in
 */

import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEventPermissions } from '@/hooks/useEventPermissions';
import { CheckCircle2, Search, QrCode, Users, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface EventCheckInProps {
  eventId: string;
}

interface AttendeeRSVP {
  id: string;
  userName: string;
  userEmail: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export const EventCheckIn: React.FC<EventCheckInProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { isAdmin, hasAdminPermission } = useEventPermissions(eventId);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendees, setAttendees] = useState<AttendeeRSVP[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Load attendees
  const loadAttendees = async () => {
    if (!isAdmin) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('event_rsvps')
        .select('id, user_name, user_email, status, checked_in, checked_in_at')
        .eq('event_id', eventId)
        .in('status', ['going', 'waitlist'])
        .order('user_name');

      if (error) {
        console.error('Failed to load attendees:', error);
        return;
      }

      const attendeeList = (data || []).map((rsvp: any) => ({
        id: rsvp.id,
        userName: rsvp.user_name,
        userEmail: rsvp.user_email,
        status: rsvp.status,
        checkedIn: rsvp.checked_in || false,
        checkedInAt: rsvp.checked_in_at
      }));

      setAttendees(attendeeList);
      setTotalAttendees(attendeeList.length);
      setCheckedInCount(attendeeList.filter(a => a.checkedIn).length);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check in attendee
  const checkInAttendee = async (rsvpId: string) => {
    if (!user?.id || !isAdmin) return;

    try {
      setIsCheckingIn(true);

      const { error } = await supabase.rpc('check_in_attendee', {
        _rsvp_id: rsvpId,
        _checked_in_by: user.id
      });

      if (error) {
        console.error('Failed to check in attendee:', error);
        return false;
      }

      // Reload attendees
      await loadAttendees();
      return true;
    } catch (error) {
      console.error('Error checking in attendee:', error);
      return false;
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Verify QR code ticket
  const verifyQRCode = async (qrData: string) => {
    try {
      const ticketData = JSON.parse(qrData);
      const { eventId: ticketEventId, userId } = ticketData;

      if (ticketEventId !== eventId) {
        alert('Invalid ticket for this event');
        return;
      }

      // Find RSVP by user_id
      const { data: rsvp, error } = await supabase
        .from('event_rsvps')
        .select('id, user_name, checked_in')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error || !rsvp) {
        alert('Ticket not found');
        return;
      }

      if (rsvp.checked_in) {
        alert(`${rsvp.user_name} is already checked in`);
        return;
      }

      const success = await checkInAttendee(rsvp.id);
      if (success) {
        alert(`Checked in: ${rsvp.user_name}`);
        setScanResult(null);
      }
    } catch (error) {
      console.error('Error verifying QR code:', error);
      alert('Invalid QR code format');
    }
  };

  // Filter attendees by search query
  const filteredAttendees = attendees.filter(attendee =>
    attendee.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  React.useEffect(() => {
    if (isAdmin) {
      loadAttendees();
    }
  }, [eventId, isAdmin]);

  if (!isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You must be an event organizer to access check-in functionality.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Check-in Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Check-In Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{checkedInCount}</div>
              <div className="text-sm text-gray-400">Checked In</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalAttendees - checkedInCount}</div>
              <div className="text-sm text-gray-400">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>Scan attendee tickets to check them in</CardDescription>
        </CardHeader>
        <CardContent>
          {showQRScanner ? (
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
                {/* TODO: Integrate with QR code scanner library (e.g., @zxing/library) */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white text-sm">QR Scanner UI - Requires @zxing/library integration</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowQRScanner(false)}
                className="w-full"
              >
                Close Scanner
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowQRScanner(true)}
              className="w-full"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Open QR Scanner
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Manual Check-In
          </CardTitle>
          <CardDescription>Search and check in attendees manually</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {isLoading ? (
            <LoadingSpinner className="mx-auto my-8" />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-white">{attendee.userName}</div>
                    <div className="text-sm text-gray-400">{attendee.userEmail}</div>
                    {attendee.status === 'waitlist' && (
                      <span className="text-xs text-yellow-500">Waitlist</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {attendee.checkedIn ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-gray-400">
                          {attendee.checkedInAt
                            ? new Date(attendee.checkedInAt).toLocaleTimeString()
                            : 'Checked in'}
                        </span>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => checkInAttendee(attendee.id)}
                        disabled={isCheckingIn}
                      >
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredAttendees.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'No attendees found' : 'No attendees registered'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
