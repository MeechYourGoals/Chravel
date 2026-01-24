import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import {
  Loader2,
  Users,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
  RefreshCw,
  Mail,
  ArrowRight,
  Lock,
  WifiOff,
  UserX,
} from 'lucide-react';
import {
  InviteErrorCode,
  InviteError,
  INVITE_ERROR_SPECS,
  normalizeErrorCode,
  createInviteError,
} from '../types/inviteErrors';

interface InvitePreviewData {
  invite: {
    trip_id: string;
    is_active: boolean;
    expires_at: string | null;
    max_uses: number | null;
    current_uses: number;
    require_approval: boolean;
  };
  trip: {
    name: string;
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    cover_image_url: string | null;
    trip_type: string | null;
    member_count: number;
  };
}

const INVITE_CODE_STORAGE_KEY = 'chravel_pending_invite_code';

const JoinTrip = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteData, setInviteData] = useState<InvitePreviewData | null>(null);
  const [error, setError] = useState<InviteError | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const autoJoinAttemptedRef = useRef(false);

  // Debug logging on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[JoinTrip] Component mounted', {
        token,
        authLoading,
        loading,
        hasUser: !!user,
        pathname: location.pathname,
      });
    }
  }, []);

  // Safety timeout - prevent infinite loading states
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('[JoinTrip] Loading timeout after 5s - forcing completion');
        setLoading(false);
        if (!inviteData && !error) {
          setError(createInviteError('NETWORK_ERROR'));
        }
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading, inviteData, error]);

  // Set document head for rich link previews
  useEffect(() => {
    const tripName = inviteData?.trip.name || 'Plan Trips Better';
    const destination = inviteData?.trip.destination || 'an exciting destination';
    const imageUrl =
      inviteData?.trip.cover_image_url ||
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop';

    document.title = inviteData?.trip.name
      ? `Join ${tripName} - Chravel`
      : 'Plan Trips Better - Chravel';

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
    updateMetaTag(
      'og:description',
      `You've been invited to join a trip to ${destination}. Click to see details and join the adventure!`,
    );
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:image', imageUrl);
    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:title', `Join ${tripName}!`);
    updateMetaName(
      'twitter:description',
      `You've been invited to join a trip to ${destination}. Click to see details!`,
    );
    updateMetaName('twitter:image', imageUrl);
  }, [inviteData]);

  // Check for stored invite code after login
  useEffect(() => {
    const storedInviteCode = sessionStorage.getItem(INVITE_CODE_STORAGE_KEY);
    if (storedInviteCode && user && !token) {
      // User just logged in with a pending invite
      sessionStorage.removeItem(INVITE_CODE_STORAGE_KEY);
      navigate(`/join/${storedInviteCode}`, { replace: true });
    }
  }, [user, token, navigate]);

  useEffect(() => {
    if (token) {
      checkDeepLinkAndFetchInvite();
    } else {
      setError(createInviteError('INVALID_LINK'));
      setLoading(false);
    }
  }, [token]);

  const checkDeepLinkAndFetchInvite = async () => {
    if (!token) return;

    // ALWAYS fetch invite preview first - show the user the trip details
    // regardless of platform. Deep linking via button click is optional.
    await fetchInvitePreview();
  };

  const fetchInvitePreview = async () => {
    if (import.meta.env.DEV) {
      console.log('[JoinTrip] fetchInvitePreview called', { token });
    }

    if (!token) {
      if (import.meta.env.DEV) {
        console.warn('[JoinTrip] No token provided');
      }
      setLoading(false);
      return;
    }

    // Handle demo invite codes - redirect to auth instead of showing error
    if (token.startsWith('demo-')) {
      if (import.meta.env.DEV) {
        console.log('[JoinTrip] Demo invite code detected, redirecting to auth');
      }
      // Demo invites should redirect to sign up - they're not real invites
      navigate(`/auth?mode=signup&returnTo=${encodeURIComponent('/')}`, { replace: true });
      return;
    }

    // Validate Supabase client
    if (!supabase) {
      console.error('[JoinTrip] Supabase client not initialized');
      setError(
        createInviteError('NETWORK_ERROR', undefined, 'App initialization error. Please refresh the page.'),
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (import.meta.env.DEV) {
        console.log('[JoinTrip] Invoking get-invite-preview edge function');
      }

      // Use edge function to get invite preview (works without auth)
      const { data, error: funcError } = await supabase.functions.invoke('get-invite-preview', {
        body: { code: token },
      });

      if (import.meta.env.DEV) {
        console.log('[JoinTrip] Edge function response:', { data, error: funcError });
      }

      if (funcError) {
        if (import.meta.env.DEV) {
          console.error('[JoinTrip] Edge function error:', funcError);
        }
        setError(createInviteError('NETWORK_ERROR'));
        return;
      }

      if (!data?.success) {
        if (import.meta.env.DEV) {
          console.error('[JoinTrip] Invite preview error:', data?.error);
        }
        // Normalize legacy error codes to new taxonomy
        const errorCode = normalizeErrorCode(data?.error_code);
        setError(
          createInviteError(
            errorCode,
            {
              tripId: data?.trip?.id,
              tripName: data?.trip?.name,
            },
            data?.error,
          ),
        );
        return;
      }

      if (import.meta.env.DEV) {
        console.log('[JoinTrip] Successfully loaded invite data');
      }
      setInviteData(data);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[JoinTrip] Critical error fetching invite preview:', err);
      }
      setError(createInviteError('UNKNOWN_ERROR'));
    } finally {
      // ALWAYS stop loading regardless of success/failure
      setLoading(false);
      if (import.meta.env.DEV) {
        console.log('[JoinTrip] fetchInvitePreview completed, loading set to false');
      }
    }
  };

  // Auto-join after auth completes (P0 conversion path)
  useEffect(() => {
    if (!user) return;
    if (!token) return;
    if (!inviteData) return;
    if (loading) return;
    if (joining) return;
    if (joinSuccess) return;
    if (autoJoinAttemptedRef.current) return;

    autoJoinAttemptedRef.current = true;
    void handleJoinTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, inviteData, loading, joining, joinSuccess]);

  const handleJoinTrip = async () => {
    if (!user) {
      // Store invite code and redirect to login
      if (token) {
        sessionStorage.setItem(INVITE_CODE_STORAGE_KEY, token);
      }
      navigate(`/auth?mode=signin&returnTo=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
      return;
    }

    if (!token || !inviteData) return;

    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-trip', {
        body: { inviteCode: token },
      });

      if (error) {
        console.error('[JoinTrip] Edge function error:', error);
        // Try to extract a meaningful message from the error
        let errorMessage = 'Failed to join trip. Please try again.';
        if (error.message) {
          try {
            // Edge function errors may contain JSON body
            const parsed = JSON.parse(error.message);
            errorMessage = parsed.message || parsed.error || errorMessage;
          } catch {
            // Not JSON, use the message directly unless it's the generic non-2xx error
            if (!error.message.includes('non-2xx')) {
              errorMessage = error.message;
            }
          }
        }
        toast.error(errorMessage);
        setJoining(false);
        return;
      }

      if (!data.success) {
        toast.error(data.message || 'Failed to join trip');
        setJoining(false);
        return;
      }

      if (data.requires_approval) {
        toast.success(
          data.message ||
            "Join request submitted! You'll see the trip on your home page once approved.",
        );
        setJoinSuccess(true);
        setJoining(false);
        // Redirect to home page after 2 seconds to show pending trip card
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
        return;
      }

      if (data.already_member) {
        toast.info(data.message || "You're already a member!");
      } else {
        toast.success(data.message || 'Successfully joined the trip!');
      }

      setJoinSuccess(true);

      setTimeout(() => {
        if (data.trip_type === 'pro') {
          navigate(`/tour/pro/${data.trip_id}`);
        } else if (data.trip_type === 'event') {
          navigate(`/event/${data.trip_id}`);
        } else {
          navigate(`/trip/${data.trip_id}`);
        }
      }, 1000);
    } catch (err) {
      console.error('Error joining trip:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLoginRedirect = () => {
    if (token) {
      sessionStorage.setItem(INVITE_CODE_STORAGE_KEY, token);
    }
    navigate(`/auth?mode=signin&returnTo=${encodeURIComponent(location.pathname)}`, {
      replace: true,
    });
  };

  const handleSignupRedirect = () => {
    if (token) {
      sessionStorage.setItem(INVITE_CODE_STORAGE_KEY, token);
    }
    navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(location.pathname)}`, {
      replace: true,
    });
  };

  const formatDateRange = () => {
    if (!inviteData?.trip.start_date) return null;
    const start = new Date(inviteData.trip.start_date);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (inviteData.trip.end_date) {
      const end = new Date(inviteData.trip.end_date);
      const endStr = end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  };

  /**
   * Get the appropriate icon for an error code.
   * Icons are color-coded by severity: info (blue), warning (yellow), error (red).
   */
  const getErrorIcon = useCallback((error: InviteError) => {
    const spec = INVITE_ERROR_SPECS[error.code];
    const iconClass = 'h-12 w-12 mx-auto mb-4';

    const colorClass =
      spec.severity === 'error'
        ? 'text-red-400'
        : spec.severity === 'warning'
          ? 'text-yellow-400'
          : 'text-blue-400';

    switch (spec.icon) {
      case 'auth':
        return <LogIn className={`${iconClass} ${colorClass}`} />;
      case 'clock':
        return <Clock className={`${iconClass} ${colorClass}`} />;
      case 'lock':
        return <Lock className={`${iconClass} ${colorClass}`} />;
      case 'users':
        return <Users className={`${iconClass} ${colorClass}`} />;
      case 'network':
        return <WifiOff className={`${iconClass} ${colorClass}`} />;
      case 'check':
        return <CheckCircle2 className={`${iconClass} text-green-400`} />;
      default:
        return <AlertCircle className={`${iconClass} ${colorClass}`} />;
    }
  }, []);

  /**
   * Handle CTA button clicks based on error action type.
   * Each CTA maps to a specific recovery action.
   */
  const handleErrorCTA = useCallback(
    (action: string, errorData?: InviteError['metadata']) => {
      switch (action) {
        case 'login':
          if (token) {
            sessionStorage.setItem(INVITE_CODE_STORAGE_KEY, token);
          }
          navigate(`/auth?mode=signin&returnTo=${encodeURIComponent(location.pathname)}`, {
            replace: true,
          });
          break;
        case 'signup':
          if (token) {
            sessionStorage.setItem(INVITE_CODE_STORAGE_KEY, token);
          }
          navigate(`/auth?mode=signup&returnTo=${encodeURIComponent(location.pathname)}`, {
            replace: true,
          });
          break;
        case 'switch_account':
          // Sign out and redirect to login with invite preserved
          if (token) {
            sessionStorage.setItem(INVITE_CODE_STORAGE_KEY, token);
          }
          supabase.auth.signOut().then(() => {
            navigate(`/auth?mode=signin&returnTo=${encodeURIComponent(location.pathname)}`, {
              replace: true,
            });
          });
          break;
        case 'request_new_invite':
          // Show toast with guidance and redirect to dashboard
          toast.info('Contact the trip organizer for a new invite link.');
          navigate('/');
          break;
        case 'contact_host':
          toast.info('Contact the trip organizer for help.');
          navigate('/');
          break;
        case 'go_to_dashboard':
          navigate('/');
          break;
        case 'retry':
          setError(null);
          setLoading(true);
          void fetchInvitePreview();
          break;
        case 'view_request_status':
          // Navigate to home where pending requests are shown
          navigate('/');
          break;
        case 'open_trip':
          if (errorData?.tripId) {
            const tripType = errorData.tripType || 'consumer';
            if (tripType === 'pro') {
              navigate(`/tour/pro/${errorData.tripId}`);
            } else if (tripType === 'event') {
              navigate(`/event/${errorData.tripId}`);
            } else {
              navigate(`/trip/${errorData.tripId}`);
            }
          } else {
            navigate('/');
          }
          break;
        default:
          navigate('/');
      }
    },
    [navigate, token, location.pathname],
  );

  /**
   * Get CTA button label based on action type.
   */
  const getCTALabel = useCallback((action: string): string => {
    const labels: Record<string, string> = {
      login: 'Log In',
      signup: 'Sign Up',
      switch_account: 'Switch Account',
      request_new_invite: 'Request New Invite',
      contact_host: 'Contact Host',
      go_to_dashboard: 'Go to Dashboard',
      retry: 'Try Again',
      view_request_status: 'View Request Status',
      open_trip: 'Open Trip',
    };
    return labels[action] || 'Continue';
  }, []);

  /**
   * Get CTA button icon based on action type.
   */
  const getCTAIcon = useCallback((action: string) => {
    switch (action) {
      case 'login':
        return <LogIn className="h-4 w-4" />;
      case 'signup':
        return <UserPlus className="h-4 w-4" />;
      case 'switch_account':
        return <UserX className="h-4 w-4" />;
      case 'request_new_invite':
      case 'contact_host':
        return <Mail className="h-4 w-4" />;
      case 'retry':
        return <RefreshCw className="h-4 w-4" />;
      case 'open_trip':
      case 'view_request_status':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return null;
    }
  }, []);

  // Show loading ONLY while fetching invite data
  // DO NOT block on authLoading - unauthenticated users should see preview immediately
  if (loading) {
    if (import.meta.env.DEV) {
      console.log('[JoinTrip] Rendering loading state');
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invite details...</p>
        </div>
      </div>
    );
  }

  // Fallback for when loading is done but no data and no error
  if (!inviteData && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-card/50 backdrop-blur-md border border-border rounded-3xl p-8 shadow-xl">
          <WifiOff className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't load the invite details. Please try again.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              void fetchInvitePreview();
            }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-xl transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    const spec = INVITE_ERROR_SPECS[error.code];
    const primaryCTA = error.primaryCTA || spec.primaryCTA;
    const secondaryCTA = error.secondaryCTA || spec.secondaryCTA;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-card/50 backdrop-blur-md border border-border rounded-3xl p-8">
          {getErrorIcon(error)}
          <h1 className="text-2xl font-bold text-foreground mb-4">{error.title}</h1>
          <p className="text-muted-foreground mb-6">{error.message}</p>

          {/* Trip context if available */}
          {error.metadata?.tripName && (
            <div className="mb-6 p-3 bg-muted/30 border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">
                Trip: <span className="text-foreground font-medium">{error.metadata.tripName}</span>
              </p>
            </div>
          )}

          {/* Account mismatch context */}
          {error.code === 'ACCOUNT_MISMATCH' && error.metadata?.invitedEmail && (
            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-sm text-yellow-400">
                Invite sent to:{' '}
                <span className="font-medium">{error.metadata.invitedEmail}</span>
              </p>
              {error.metadata.currentEmail && (
                <p className="text-sm text-muted-foreground mt-1">
                  Logged in as: <span className="font-medium">{error.metadata.currentEmail}</span>
                </p>
              )}
            </div>
          )}

          {/* Primary CTA Button */}
          <button
            onClick={() => handleErrorCTA(primaryCTA, error.metadata)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {getCTAIcon(primaryCTA)}
            {getCTALabel(primaryCTA)}
          </button>

          {/* Secondary CTA Button */}
          {secondaryCTA && (
            <button
              onClick={() => handleErrorCTA(secondaryCTA, error.metadata)}
              className="mt-3 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {getCTAIcon(secondaryCTA)}
              {getCTALabel(secondaryCTA)}
            </button>
          )}

          {/* Help text for certain errors */}
          {(error.code === 'INVITE_EXPIRED' ||
            error.code === 'INVITE_INACTIVE' ||
            error.code === 'INVITE_MAX_USES') && (
            <p className="mt-4 text-xs text-muted-foreground">
              Tip: Ask the trip organizer to send you a new invite link.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-card/50 backdrop-blur-md border border-border rounded-3xl p-8">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {inviteData?.invite.require_approval ? 'Request Submitted!' : 'Welcome!'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {inviteData?.invite.require_approval
              ? 'Your join request has been submitted. The organizer will review it soon.'
              : `You've successfully joined ${inviteData?.trip.name}!`}
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  const coverImage =
    inviteData?.trip.cover_image_url ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl overflow-hidden max-w-md w-full">
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={inviteData?.trip.name || 'Trip'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-foreground">
              {inviteData?.trip.name || 'Trip Invitation'}
            </h1>
            {inviteData?.trip.destination && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin size={14} />
                <span className="text-sm">{inviteData.trip.destination}</span>
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

            {inviteData?.trip.member_count !== undefined && (
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-primary" />
                <span className="text-foreground">
                  {inviteData.trip.member_count}{' '}
                  {inviteData.trip.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
            )}

            {inviteData?.trip.trip_type && inviteData.trip.trip_type !== 'consumer' && (
              <div className="inline-flex px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                {inviteData.trip.trip_type === 'pro' ? 'Pro Trip' : 'Event'}
              </div>
            )}

            {inviteData?.invite.expires_at && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Clock size={14} />
                <span>
                  Invite expires: {new Date(inviteData.invite.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!user ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">
                Please log in to join this trip
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleLoginRedirect}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-6 rounded-xl transition-all duration-200 font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={handleSignupRedirect}
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

          {inviteData?.invite.require_approval && !joining && user && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                <p className="font-medium text-yellow-400">Approval Required</p>
              </div>
              <p className="text-yellow-400/80 text-sm">
                This trip requires approval from the organizer. Your request will be reviewed once
                submitted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinTrip;
