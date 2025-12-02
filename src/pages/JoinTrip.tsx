import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Users, MapPin, Calendar, Clock, Image } from 'lucide-react';

interface InviteData {
  trip_id: string;
  invite_token?: string;
  created_at: string;
  require_approval?: boolean;
  expires_at?: string | null;
  max_uses?: number;
  current_uses?: number;
  is_active?: boolean;
  code?: string;
  id?: string;
  created_by?: string;
  updated_at?: string;
}

interface TripDetails {
  name: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  cover_image_url?: string;
  trip_type?: string;
  member_count?: number;
}

const JoinTrip = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [error, setError] = useState<string>('');

  // Set document head for rich link previews
  useEffect(() => {
    const tripName = tripDetails?.name || 'an Amazing Trip';
    const destination = tripDetails?.destination || 'an exciting destination';
    const imageUrl = tripDetails?.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop';
    
    document.title = `Join ${tripName} - Chravel`;
    
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updateMetaName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMetaTag('og:title', `Join ${tripName}!`);
    updateMetaTag('og:description', `You've been invited to join a trip to ${destination}. Click to see details and join the adventure!`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:image', imageUrl);
    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:title', `Join ${tripName}!`);
    updateMetaName('twitter:description', `You've been invited to join a trip to ${destination}. Click to see details!`);
    updateMetaName('twitter:image', imageUrl);
  }, [tripDetails]);

  useEffect(() => {
    if (token) {
      checkDeepLinkAndFetchInvite();
    } else {
      setError('Invalid invite link');
      setLoading(false);
    }
  }, [token]);

  const checkDeepLinkAndFetchInvite = async () => {
    if (!token) return;

    const deepLinkUrl = `chravel://join-trip/${token}`;
    
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      const startTime = Date.now();
      window.location.href = deepLinkUrl;
      
      setTimeout(() => {
        if (Date.now() - startTime < 2000) {
          fetchInviteData();
        }
      }, 1500);
    } else {
      fetchInviteData();
    }
  };

  const fetchInviteData = async () => {
    if (!token) return;

    try {
      // Fetch invite data
      const { data: invite, error: inviteError } = await supabase
        .from('trip_invites')
        .select('*')
        .eq('code', token)
        .single();

      if (inviteError || !invite) {
        console.error('Error fetching invite:', inviteError);
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      // Validate invite
      if (!invite.is_active) {
        setError('This invite link has been deactivated');
        setLoading(false);
        return;
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setError('This invite link has expired');
        setLoading(false);
        return;
      }

      if (invite.max_uses && invite.current_uses >= invite.max_uses) {
        setError('This invite link has reached its maximum number of uses');
        setLoading(false);
        return;
      }

      setInviteData({
        trip_id: invite.trip_id,
        invite_token: token,
        created_at: invite.created_at,
        require_approval: false,
        expires_at: invite.expires_at,
        max_uses: invite.max_uses,
        current_uses: invite.current_uses,
        is_active: invite.is_active,
        code: invite.code,
        id: invite.id,
        created_by: invite.created_by
      });

      // Fetch trip details
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('name, destination, start_date, end_date, cover_image_url, trip_type')
        .eq('id', invite.trip_id)
        .single();

      if (!tripError && trip) {
        // Get member count
        const { count } = await supabase
          .from('trip_members')
          .select('*', { count: 'exact', head: true })
          .eq('trip_id', invite.trip_id);

        setTripDetails({
          name: trip.name,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          cover_image_url: trip.cover_image_url,
          trip_type: trip.trip_type,
          member_count: count || 0
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching invite data:', error);
      setError('Failed to load invite details');
      setLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!user) {
      toast.error('Please log in to join this trip');
      return;
    }

    if (!token || !inviteData) return;

    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-trip', {
        body: { inviteCode: token }
      });

      if (error) {
        console.error('Error joining trip:', error);
        toast.error(error.message || 'Failed to join trip');
        setJoining(false);
        return;
      }

      if (!data.success) {
        toast.error(data.message || 'Failed to join trip');
        setJoining(false);
        return;
      }

      if (data.requires_approval) {
        toast.success(data.message || 'Join request submitted!');
        setJoining(false);
        setInviteData(prev => prev ? { ...prev, require_approval: true } as any : null);
        return;
      }

      toast.success(data.message || 'Successfully joined the trip!');
      
      setTimeout(() => {
        if (data.trip_type === 'pro') {
          navigate(`/tour/pro/${data.trip_id}`);
        } else if (data.trip_type === 'event') {
          navigate(`/event/${data.trip_id}`);
        } else {
          navigate(`/trip/${data.trip_id}`);
        }
      }, 1000);

    } catch (error) {
      console.error('Error joining trip:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const formatDateRange = () => {
    if (!tripDetails?.start_date) return null;
    const start = new Date(tripDetails.start_date);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (tripDetails.end_date) {
      const end = new Date(tripDetails.end_date);
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invite details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const coverImage = tripDetails?.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl overflow-hidden max-w-md w-full">
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={coverImage} 
            alt={tripDetails?.name || 'Trip'} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-foreground">
              {tripDetails?.name || 'Trip Invitation'}
            </h1>
            {tripDetails?.destination && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin size={14} />
                <span className="text-sm">{tripDetails.destination}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Trip Info */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6 space-y-3">
            {formatDateRange() && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-primary" />
                <span className="text-foreground">{formatDateRange()}</span>
              </div>
            )}
            
            {tripDetails?.member_count !== undefined && (
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-primary" />
                <span className="text-foreground">
                  {tripDetails.member_count} {tripDetails.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
            )}

            {tripDetails?.trip_type && tripDetails.trip_type !== 'standard' && (
              <div className="inline-flex px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                {tripDetails.trip_type === 'pro' ? 'Pro Trip' : 'Event'}
              </div>
            )}

            {inviteData?.expires_at && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Clock size={14} />
                <span>Invite expires: {new Date(inviteData.expires_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!user ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">Please log in to join this trip</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-6 rounded-xl transition-all duration-200 font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 px-6 rounded-xl transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleJoinTrip}
                disabled={joining}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 px-6 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Trip'
                )}
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 px-6 rounded-xl transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {inviteData?.require_approval && !joining && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                <p className="font-medium text-yellow-400">Approval Required</p>
              </div>
              <p className="text-yellow-400/80 text-sm">
                This trip requires approval from the organizer. Your request will be reviewed once submitted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinTrip;