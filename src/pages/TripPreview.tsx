import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { tripsData } from '../data/tripsData';
import { Loader2, Users, MapPin, Calendar, Share2, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

interface TripPreviewData {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  dateRange?: string; // Pre-formatted date string for demo trips
  cover_image_url: string | null;
  trip_type: string | null;
  member_count: number;
  description?: string | null;
}

const TripPreview = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState<TripPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Safety timeout - prevent infinite loading states
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('[TripPreview] Loading timeout after 5s - forcing completion');
        setLoading(false);
        if (!tripData && !error) {
          setError('Failed to load trip details. Please refresh.');
        }
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading, tripData, error]);

  // Set document head for rich link previews (social media cards)
  useEffect(() => {
    const tripName = tripData?.name || 'an Amazing Trip';
    const destination = tripData?.destination || 'an exciting destination';
    const imageUrl = tripData?.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop';

    document.title = `${tripName} - Chravel`;

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

    updateMetaTag('og:title', `Check out ${tripName} on Chravel!`);
    updateMetaTag('og:description', `A trip to ${destination}. Plan your group travel adventures with Chravel!`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('og:url', window.location.href);
    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:title', `Check out ${tripName} on Chravel!`);
    updateMetaName('twitter:description', `A trip to ${destination}. Plan your group travel adventures with Chravel!`);
    updateMetaName('twitter:image', imageUrl);
  }, [tripData]);

  useEffect(() => {
    if (tripId) {
      fetchTripPreview();
    }
  }, [tripId]);

  const fetchTripPreview = async () => {
    if (!tripId) return;

    setLoading(true);
    setError(null);

    // Check if this is a demo trip ID (numeric)
    const numericId = parseInt(tripId, 10);
    if (!isNaN(numericId) && numericId > 0 && numericId <= 12) {
      // Demo trip - use mock data
      const demoTrip = tripsData.find(t => t.id === numericId);
      if (demoTrip) {
        setTripData({
          id: tripId,
          name: demoTrip.title,
          destination: demoTrip.location,
          start_date: null,
          end_date: null,
          dateRange: demoTrip.dateRange, // Use pre-formatted date from mock data
          cover_image_url: demoTrip.coverPhoto || null,
          trip_type: 'consumer',
          member_count: demoTrip.participants.length,
          description: null
        });
        setLoading(false);
        return;
      }
    }

    // Real trip (UUID) - fetch via public edge function to avoid RLS blank/404 for unauthenticated users
    try {
      const { data, error: funcError } = await supabase.functions.invoke('get-trip-preview', {
        body: { tripId }
      });

      if (funcError || !data?.success || !data?.trip) {
        setError(data?.error || funcError?.message || 'Trip not found');
        return;
      }

      setTripData(data.trip as TripPreviewData);
    } catch (err) {
      console.error('Error fetching trip preview:', err);
      setError('Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out ${tripData?.name || 'this trip'} on Chravel!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: tripData?.name || 'Trip on Chravel',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or error
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleViewTrip = () => {
    // Check if this is a demo trip (numeric ID 1-12)
    const numericId = tripId ? parseInt(tripId, 10) : NaN;
    const isDemoTrip = !isNaN(numericId) && numericId > 0 && numericId <= 12;

    if (isDemoTrip) {
      // Demo trips should redirect to auth - they're not real trips in the database
      navigate(`/auth?mode=signup&returnTo=${encodeURIComponent('/')}`, { replace: true });
      return;
    }

    if (user) {
      // User is logged in, go to full trip detail
      navigate(`/trip/${tripId}`);
    } else {
      // Prompt to sign up/login
      navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(`/trip/${tripId}`)}`, { replace: true });
    }
  };

  const formatDateRange = (startDate: string | null, endDate: string | null, dateRange?: string): string => {
    // Prefer pre-formatted dateRange if available (for demo trips)
    if (dateRange) return dateRange;
    if (!startDate) return 'Dates TBD';

    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (!endDate) {
      return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    }

    const end = new Date(endDate);
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
    }

    return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-white/60">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Trip Not Found</h1>
          <p className="text-white/60 mb-6">{error || 'This trip may have been deleted or is no longer available.'}</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      {/* Hero Section with Cover Image */}
      <div className="relative h-64 md:h-80">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${tripData.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop'}')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        {/* Chravel Logo/Branding */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-yellow-400 font-bold text-lg">Chravel</span>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-sm p-3 rounded-full hover:bg-black/60 transition-colors"
        >
          <Share2 className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Trip Details Card */}
      <div className="relative -mt-20 px-4 pb-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 max-w-lg mx-auto">
          {/* Trip Name */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{tripData.name}</h1>

          {/* Trip Info */}
          <div className="space-y-3 mb-6">
            {tripData.destination && (
              <div className="flex items-center gap-3 text-white/80">
                <MapPin className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <span>{tripData.destination}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-white/80">
              <Calendar className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span>{formatDateRange(tripData.start_date, tripData.end_date, tripData.dateRange)}</span>
            </div>

            <div className="flex items-center gap-3 text-white/80">
              <Users className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span>{tripData.member_count} {tripData.member_count === 1 ? 'Chraveler' : 'Chravelers'}</span>
            </div>
          </div>

          {/* Description if available */}
          {tripData.description && (
            <p className="text-white/60 text-sm mb-6 line-clamp-3">{tripData.description}</p>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleViewTrip}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold py-3 text-base"
            >
              {(() => {
                const numericId = tripId ? parseInt(tripId, 10) : NaN;
                const isDemoTrip = !isNaN(numericId) && numericId > 0 && numericId <= 12;
                if (isDemoTrip) return 'Sign Up to View';
                return user ? 'View Full Trip' : 'Sign Up to View';
              })()}
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 py-3 text-base"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Trip
            </Button>
          </div>

          {/* App Promo */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-sm mb-2">Plan group trips together</p>
            <p className="text-yellow-400 font-medium">chravel.app</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPreview;
