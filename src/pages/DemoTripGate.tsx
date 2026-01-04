import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type TripPreviewData = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  trip_type: string | null;
  member_count: number;
  description?: string | null;
};

function isUuid(value: string): boolean {
  // Accept UUID v1-v5.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toPrefillPayload(trip: TripPreviewData): {
  title: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  tripType: 'consumer' | 'pro' | 'event';
} {
  const parseIsoDate = (value: string | null): string => {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  };

  const normalizedTripType: 'consumer' | 'pro' | 'event' =
    trip.trip_type === 'pro' || trip.trip_type === 'event' ? trip.trip_type : 'consumer';

  return {
    title: trip.name ?? '',
    location: trip.destination ?? '',
    description: trip.description ?? '',
    startDate: parseIsoDate(trip.start_date),
    endDate: parseIsoDate(trip.end_date),
    tripType: normalizedTripType,
  };
}

const DEMO_PREFILL_STORAGE_KEY = 'chravel_demo_trip_prefill_v1';

const DemoTripGate = () => {
  const { demoTripId } = useParams<{ demoTripId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [tripData, setTripData] = useState<TripPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeDemoTripId = useMemo(() => (demoTripId ?? '').trim(), [demoTripId]);
  const isMisroutedRealTripId = useMemo(
    () => Boolean(safeDemoTripId) && isUuid(safeDemoTripId),
    [safeDemoTripId],
  );

  useEffect(() => {
    // If someone accidentally hits the demo gate with a real trip UUID, send them to the preview route.
    if (isMisroutedRealTripId) {
      navigate(`/trip/${encodeURIComponent(safeDemoTripId)}/preview`, { replace: true });
    }
  }, [isMisroutedRealTripId, navigate, safeDemoTripId]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!safeDemoTripId || isMisroutedRealTripId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: funcError } = await supabase.functions.invoke('get-trip-preview', {
          body: { tripId: safeDemoTripId },
        });

        if (funcError || !data?.success || !data?.trip) {
          setTripData(null);
          setError(data?.error || funcError?.message || 'Unable to load demo trip.');
          return;
        }

        setTripData(data.trip as TripPreviewData);
      } catch (err) {
        setTripData(null);
        setError(err instanceof Error ? err.message : 'Unable to load demo trip.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isMisroutedRealTripId, safeDemoTripId]);

  const handleSignUp = useCallback(() => {
    const returnTo = `/demo/trip/${encodeURIComponent(safeDemoTripId)}`;
    navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, safeDemoTripId]);

  const handleLogIn = useCallback(() => {
    const returnTo = `/demo/trip/${encodeURIComponent(safeDemoTripId)}`;
    navigate(`/auth?mode=signin&returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, safeDemoTripId]);

  const handleCreateTripLikeThis = useCallback(() => {
    if (tripData) {
      try {
        sessionStorage.setItem(
          DEMO_PREFILL_STORAGE_KEY,
          JSON.stringify(toPrefillPayload(tripData)),
        );
      } catch {
        // Non-fatal: still allow user to proceed.
      }
    }

    const target = `/?createTrip=open`;
    if (user) {
      navigate(target);
      return;
    }

    navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(target)}`);
  }, [navigate, tripData, user]);

  if (!safeDemoTripId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Demo Trip</h1>
          <p className="text-white/60 mb-6">Missing demo trip id.</p>
          <Button onClick={() => navigate('/')} className="bg-white text-black hover:bg-white/90">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-yellow-400 mx-auto mb-3" />
          <p className="text-white/60">Loading demo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <div className="relative h-48">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${
                  tripData?.cover_image_url ||
                  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop'
                }')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            <div className="absolute top-4 left-4">
              <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-yellow-400 font-bold text-lg">ChravelApp</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {tripData?.name || 'This Demo Trip'}
            </h1>
            <p className="text-white/60 mb-5">
              This is a <span className="text-white font-medium">demo trip</span> created to show how
              ChravelApp works. Sign up or log in to create your own trip and unlock the full
              experience.
            </p>

            {error && (
              <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/70">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleSignUp}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold py-3"
              >
                Sign Up
              </Button>

              <Button
                onClick={handleLogIn}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 py-3"
              >
                Log In
              </Button>

              <button
                type="button"
                onClick={handleCreateTripLikeThis}
                className="w-full text-center text-sm text-white/70 hover:text-white transition-colors pt-1"
              >
                Create a Trip Like This
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-white/40 text-xs">Powered by ChravelApp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoTripGate;
