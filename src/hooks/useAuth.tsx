import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SUPER_ADMIN_EMAILS } from '@/constants/admins';
import { useDemoModeStore } from '@/store/demoModeStore';
import { isSessionTokenValid } from '@/utils/tokenValidation';
import { authDebug } from '@/utils/authDebug';

// Timeout utility to prevent indefinite hanging on database queries
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
};

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  real_name: string | null;
  name_preference: 'real' | 'display' | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  show_email: boolean;
  show_phone: boolean;
}

interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  realName?: string;
  namePreference: 'real' | 'display';
  hasCompletedProfileSetup: boolean;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isPro: boolean;
  showEmail: boolean;
  showPhone: boolean;
  // Enhanced pro role system
  proRole?:
    | 'admin'
    | 'staff'
    | 'talent'
    | 'player'
    | 'crew'
    | 'security'
    | 'medical'
    | 'producer'
    | 'speakers'
    | 'guests'
    | 'coordinators'
    | 'logistics'
    | 'press';
  organizationId?: string;
  permissions: string[];
  notificationSettings: {
    messages: boolean;
    broadcasts: boolean;
    tripUpdates: boolean;
    email: boolean;
    push: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithPhone: (phone: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ error?: string; success?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: any }>;
  updateNotificationSettings: (updates: Partial<User['notificationSettings']>) => Promise<void>;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const demoView = useDemoModeStore(state => state.demoView);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(true);

  /**
   * App-preview mode should behave like "full demo access" even when there is no real auth session.
   * Many settings panels (and other UI) assume `useAuth().user` exists; returning null in app-preview
   * can cause runtime crashes/blank screens.
   *
   * We provide a stable, UUID-shaped demo user so code paths expecting UUIDs don't throw.
   */
  const demoUser: User = useMemo(
    () => ({
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      email: 'demo@chravel.com',
      phone: undefined,
      displayName: 'Demo User',
      realName: undefined,
      namePreference: 'display',
      hasCompletedProfileSetup: true,
      firstName: 'Demo',
      lastName: 'User',
      avatar: '',
      bio: 'Exploring Chravel in app preview mode.',
      // For app-preview we want feature access, but still rely on demo-mode gating
      // to prevent real server-side mutations.
      isPro: true,
      showEmail: true,
      showPhone: true,
      proRole: 'admin',
      organizationId: undefined,
      permissions: ['read', 'write'],
      notificationSettings: {
        messages: true,
        broadcasts: true,
        tripUpdates: true,
        email: true,
        push: true,
      },
    }),
    [],
  );

  const shouldUseDemoUser = demoView === 'app-preview';
  const shouldUseDemoUserRef = useRef<boolean>(shouldUseDemoUser);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    shouldUseDemoUserRef.current = shouldUseDemoUser;
  }, [shouldUseDemoUser]);

  /**
   * Canonical identity model:
   * - `public.profiles` row keyed by `user_id` is the source of truth for display name + avatar.
   * - We defensively "self-heal" by creating the profile row if the DB trigger didn't run.
   */
  const ensureProfileExists = useCallback(async (supabaseUser: SupabaseUser): Promise<void> => {
    try {
      const displayName =
        (supabaseUser.user_metadata?.display_name as string | undefined) ||
        (supabaseUser.user_metadata?.full_name as string | undefined) ||
        (supabaseUser.user_metadata?.name as string | undefined) ||
        supabaseUser.email?.split('@')[0] ||
        'User';

      await supabase.from('profiles').upsert(
        {
          user_id: supabaseUser.id,
          display_name: displayName,
          email: supabaseUser.email ?? null,
          phone: supabaseUser.phone ?? null,
        },
        { onConflict: 'user_id' },
      );
    } catch (error) {
      // Never block auth on profile creation failures.
      if (import.meta.env.DEV) {
        console.warn('[Auth] Failed to ensure profile exists:', error);
      }
    }
  }, []);

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, display_name, real_name, name_preference, first_name, last_name, avatar_url, bio, phone, show_email, show_phone, ' +
            'notification_settings, timezone, app_role, role, subscription_status, subscription_product_id, ' +
            'subscription_end, free_pro_trips_used, free_pro_trip_limit, free_events_used, free_event_limit, ' +
            'created_at, updated_at',
        )
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) {
          console.error('Error fetching profile:', error);
        }
        return null;
      }

      if (!data) {
        return null;
      }

      return data as unknown as UserProfile;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching profile:', error);
      }
      return null;
    }
  };

  // Helper function to transform Supabase user to app User
  const transformUser = useCallback(
    async (supabaseUser: SupabaseUser, profile?: UserProfile | null): Promise<User | null> => {
      // CRITICAL: Validate that we have a valid user ID before proceeding
      if (!supabaseUser || !supabaseUser.id) {
        if (import.meta.env.DEV) {
          console.error('[transformUser] Invalid Supabase user - missing ID', { supabaseUser });
        }
        return null;
      }

      // NOTE: Demo mode check REMOVED here - authenticated users should ALWAYS get their real data
      // Demo mode is for unauthenticated users browsing the app-preview, not for overriding real user data

      // ⚡ PERFORMANCE: Parallelize all database queries (was 2-3s sequential, now <1s parallel)
      const [userProfile, userRolesResult, orgMemberResult, notifPrefs] = await Promise.all([
        // Fetch profile with 2s timeout (reduced from 3s)
        profile || withTimeout(fetchUserProfile(supabaseUser.id), 2000, null),

        // Query user_roles table with 2s timeout
        withTimeout(
          (async () => {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', supabaseUser.id);
            return { data, error };
          })(),
          2000,
          { data: [], error: null },
        ),

        // Query org membership with 2s timeout
        withTimeout(
          (async () => {
            const { data, error } = await supabase
              .from('organization_members')
              .select('organization_id, role')
              .eq('user_id', supabaseUser.id)
              .eq('status', 'active')
              .single();
            return { data, error };
          })(),
          2000,
          { data: null, error: null },
        ),

        // Load notification prefs with 2s timeout
        (async () => {
          try {
            const { userPreferencesService } = await import('@/services/userPreferencesService');
            return await withTimeout(
              userPreferencesService.getNotificationPreferences(supabaseUser.id),
              2000,
              {
                push_enabled: false,
                email_enabled: true,
                sms_enabled: false,
                chat_messages: true,
                mentions_only: false,
                broadcasts: true,
                tasks: false,
                payments: false,
                calendar_events: true,
                calendar_reminders: true,
                polls: true,
                trip_invites: true,
                join_requests: false,
                basecamp_updates: true,
                quiet_hours_enabled: false,
                quiet_start: '22:00',
                quiet_end: '08:00',
                timezone: 'America/New_York',
              },
            );
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn(
                '[transformUser] Failed to load notification prefs, using defaults:',
                err,
              );
            }
            return {
              push_enabled: false,
              email_enabled: true,
              sms_enabled: false,
              chat_messages: true,
              mentions_only: false,
              broadcasts: true,
              tasks: false,
              payments: false,
              calendar_reminders: true,
              trip_invites: true,
              join_requests: false,
              quiet_hours_enabled: false,
              quiet_start: '22:00',
              quiet_end: '08:00',
              timezone: 'America/New_York',
            };
          }
        })(),
      ]);

      // Self-heal missing profiles row (trigger can fail in some Supabase projects/environments).
      if (!userProfile) {
        await ensureProfileExists(supabaseUser);
      }

      const roles = userRolesResult.data?.map((r: any) => r.role) || [];
      const isPro = roles.includes('pro');
      const isSystemAdmin = roles.includes('enterprise_admin');
      const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(
        supabaseUser.email?.toLowerCase().trim() || '',
      );

      // Map roles to permissions - only grant what user actually has
      const permissions: string[] = ['read'];
      if (isPro || isSystemAdmin || isSuperAdminEmail) {
        permissions.push('write');
      }
      if (isSystemAdmin || isSuperAdminEmail) {
        permissions.push('admin', 'finance', 'compliance');
      }

      // Map org member role to proRole type (owner/admin maps to admin, otherwise undefined)
      let proRole: User['proRole'] = undefined;
      if (
        orgMemberResult.data?.role === 'owner' ||
        orgMemberResult.data?.role === 'admin' ||
        isSuperAdminEmail
      ) {
        proRole = 'admin';
      }

      // Check if profile has been properly set up (display_name exists and is not empty)
      const hasCompletedProfileSetup = !!(
        userProfile?.display_name && userProfile.display_name.trim() !== ''
      );

      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        phone: userProfile?.phone ?? supabaseUser.phone,
        displayName: userProfile?.display_name || supabaseUser.email || 'User',
        realName: userProfile?.real_name ?? undefined,
        namePreference: (userProfile?.name_preference === 'real' ? 'real' : 'display') as
          | 'real'
          | 'display',
        hasCompletedProfileSetup,
        firstName: userProfile?.first_name || '',
        lastName: userProfile?.last_name || '',
        avatar: userProfile?.avatar_url || '',
        bio: userProfile?.bio || '',
        isPro,
        showEmail: userProfile?.show_email || false,
        showPhone: userProfile?.show_phone || false,
        proRole,
        organizationId: orgMemberResult.data?.organization_id || undefined,
        permissions,
        notificationSettings: {
          messages: notifPrefs.chat_messages,
          broadcasts: notifPrefs.broadcasts,
          tripUpdates: notifPrefs.calendar_reminders,
          email: notifPrefs.email_enabled,
          push: notifPrefs.push_enabled,
        },
      };
    },
    [ensureProfileExists],
  );

  /**
   * Force refresh session when token is invalid.
   * Returns refreshed session or null if refresh fails.
   */
  const forceRefreshSession = useCallback(async (): Promise<Session | null> => {
    authDebug('forceRefreshSession:start');

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        authDebug('forceRefreshSession:error', {
          message: error.message,
          name: error.name,
          status: (error as unknown as { status?: number }).status,
        });
        // Clear corrupted session
        await supabase.auth.signOut();
        return null;
      }

      // Validate the refreshed token
      if (data.session && !isSessionTokenValid(data.session.access_token)) {
        authDebug('forceRefreshSession:refreshedTokenInvalid');
        await supabase.auth.signOut();
        return null;
      }

      authDebug('forceRefreshSession:success', {
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.session?.user),
        hasExpiresAt: Boolean(data.session?.expires_at),
      });

      return data.session;
    } catch (err) {
      authDebug('forceRefreshSession:exception', { error: String(err) });
      await supabase.auth.signOut();
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Safety timeout: force loading to false after 10 seconds to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoadingRef.current) {
        setIsLoading(false);
      }
    }, 10000);

    const getSessionAndUser = async () => {
      try {
        authDebug('init:getSession:start', {
          visibilityState: document.visibilityState,
          storageAvailable: (() => {
            try {
              return typeof localStorage !== 'undefined';
            } catch {
              return false;
            }
          })(),
          hasAuthSessionKey: (() => {
            try {
              return Boolean(localStorage.getItem('chravel-auth-session'));
            } catch {
              return false;
            }
          })(),
        });
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          authDebug('init:getSession:error', {
            message: error.message,
            name: error.name,
            status: (error as unknown as { status?: number }).status,
          });
          if (import.meta.env.DEV) {
            console.error('[Auth] Error getting session:', error);
          }
          // Retry once after 1s for transient network issues
          await new Promise(r => setTimeout(r, 1000));
          const retry = await supabase.auth.getSession();
          if (retry.data.session) {
            authDebug('init:getSession:retrySessionPresent', {
              hasExpiresAt: Boolean(retry.data.session.expires_at),
              hasRefreshToken: Boolean(retry.data.session.refresh_token),
            });
            // Validate token before using
            if (!isSessionTokenValid(retry.data.session.access_token)) {
              authDebug('init:getSession:retryTokenInvalid');
              const refreshed = await forceRefreshSession();
              if (refreshed) {
                setSession(refreshed);
                const transformedUser = await transformUser(refreshed.user);
                setUser(transformedUser);
              }
              setIsLoading(false);
              return;
            }
            setSession(retry.data.session);
            const transformedUser = await transformUser(retry.data.session.user);
            setUser(transformedUser);
            setIsLoading(false);
            return;
          }
          authDebug('init:getSession:retryNoSession');
          setIsLoading(false);
          return;
        }

        authDebug('init:getSession:result', {
          hasSession: Boolean(session),
          hasUser: Boolean(session?.user),
          hasExpiresAt: Boolean(session?.expires_at),
          hasRefreshToken: Boolean(session?.refresh_token),
        });

        // CRITICAL: Validate token has required claims before using
        if (session?.access_token && !isSessionTokenValid(session.access_token)) {
          authDebug('init:getSession:tokenInvalid');

          const refreshedSession = await forceRefreshSession();
          if (refreshedSession) {
            authDebug('init:getSession:tokenInvalid:recoveredByRefresh', {
              hasExpiresAt: Boolean(refreshedSession.expires_at),
            });
            setSession(refreshedSession);
            const transformedUser = await transformUser(refreshedSession.user);
            setUser(transformedUser);
          } else {
            authDebug('init:getSession:tokenInvalid:refreshFailed');
            setUser(shouldUseDemoUserRef.current ? demoUser : null);
          }
          setIsLoading(false);
          return;
        }

        // Check if session exists but is near expiry (within 5 min)
        if (session && session.expires_at) {
          const expiresAt = session.expires_at * 1000;
          const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

          if (expiresAt < fiveMinutesFromNow) {
            if (import.meta.env.DEV) {
              console.log('[Auth] Session near expiry, proactively refreshing...');
            }
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (refreshed.session && isSessionTokenValid(refreshed.session.access_token)) {
              setSession(refreshed.session);
              const transformedUser = await transformUser(refreshed.session.user);
              setUser(transformedUser);
              setIsLoading(false);
              return;
            }
          }
        }

        setSession(session);

        if (session?.user) {
          authDebug('init:sessionPresent', {
            hasExpiresAt: Boolean(session.expires_at),
            hasRefreshToken: Boolean(session.refresh_token),
          });
          // Log session info in dev for debugging
          if (import.meta.env.DEV) {
            console.log('[Auth] Session state:', {
              hasSession: true,
              expiresAt: session.expires_at
                ? new Date(session.expires_at * 1000).toISOString()
                : null,
              refreshToken: session.refresh_token ? '(present)' : '(missing)',
              userId: session.user.id?.slice(0, 8) + '...',
            });
          }
          try {
            const transformedUser = await transformUser(session.user);
            setUser(transformedUser);
          } catch (err) {
            authDebug('init:transformUser:error', { error: String(err) });
            if (import.meta.env.DEV) {
              console.error('[Auth] Error transforming user on init:', err);
            }
            setUser(null);
          }
        } else {
          authDebug('init:noSession');
          // App-preview: provide a demo user even when not authenticated.
          setUser(shouldUseDemoUserRef.current ? demoUser : null);
        }
        setIsLoading(false);
      } catch (error) {
        authDebug('init:getSession:exception', { error: String(error) });
        if (import.meta.env.DEV) {
          console.error('[Auth] Unexpected error in getSessionAndUser:', error);
        }
        setIsLoading(false);
      }
    };

    getSessionAndUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // CRITICAL: Only synchronous state updates in callback to prevent deadlock
      authDebug('onAuthStateChange', {
        event,
        hasSession: Boolean(session),
        hasUser: Boolean(session?.user),
        hasExpiresAt: Boolean(session?.expires_at),
      });
      setSession(session);

      if (session?.user) {
        // Defer async work with setTimeout(0) to avoid Supabase auth deadlock
        setTimeout(() => {
          transformUser(session.user)
            .then(transformedUser => {
              authDebug('onAuthStateChange:transformUser:success');
              setUser(transformedUser);
              setIsLoading(false);
            })
            .catch(err => {
              authDebug('onAuthStateChange:transformUser:error', { error: String(err) });
              if (import.meta.env.DEV) {
                console.error('[Auth] Error transforming user:', err);
              }
              setUser(null);
              setIsLoading(false);
            });
        }, 0);
      } else {
        authDebug('onAuthStateChange:signedOutOrNoSession');
        // App-preview: keep demo user when logged out.
        setUser(shouldUseDemoUserRef.current ? demoUser : null);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [transformUser, demoUser]);

  // Visibility change listener: refresh session when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Standard behavior: only check/refresh if there's an existing session
        if (session) {
          supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (!currentSession && session) {
              if (import.meta.env.DEV) {
                console.log('[Auth] Session lost while away, attempting refresh...');
              }
              // Session was lost - try to refresh
              supabase.auth.refreshSession().catch(() => {
                // Refresh failed - user needs to log in again
                if (import.meta.env.DEV) {
                  console.warn('[Auth] Session refresh failed, user must re-authenticate');
                }
                setSession(null);
                setUser(shouldUseDemoUserRef.current ? demoUser : null);
              });
            } else if (currentSession && currentSession.expires_at) {
              // Check if session is near expiry
              const expiresAt = currentSession.expires_at * 1000;
              const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
              if (expiresAt < fiveMinutesFromNow) {
                if (import.meta.env.DEV) {
                  console.log('[Auth] Session near expiry on tab focus, refreshing...');
                }
                supabase.auth.refreshSession();
              }
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, demoUser]);

  // Respond to demo mode toggles while logged out (no session).
  useEffect(() => {
    if (session?.user) return;
    setUser(shouldUseDemoUser ? demoUser : null);
  }, [demoUser, session, shouldUseDemoUser]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Sign in error:', error);
        }
        setIsLoading(false);

        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          return {
            error: 'Invalid email or password. Please check your credentials and try again.',
          };
        }
        if (error.message.includes('Email not confirmed')) {
          return {
            error:
              'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
          };
        }

        return { error: error.message };
      }

      // Success path: clear loading state (auth state listener will update user)
      setIsLoading(false);
      void data;
      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected sign in error:', error);
      }
      setIsLoading(false);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Google OAuth error:', error);
        }
        if (error.message.includes('provider is not enabled')) {
          return { error: 'Google sign-in is not configured. Please contact support.' };
        }
        return { error: error.message };
      }

      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected Google OAuth error:', error);
      }
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signInWithPhone = async (phone: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Phone OTP error:', error);
        }
        setIsLoading(false);

        // Provide more specific error messages
        if (error.message.includes('not configured') || error.message.includes('SMS provider')) {
          return { error: 'Phone authentication is not configured. Please use email to sign in.' };
        }
        if (error.message.includes('Invalid phone number')) {
          return {
            error: 'Please enter a valid phone number with country code (e.g., +1234567890).',
          };
        }

        return { error: error.message };
      }

      setIsLoading(false);
      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected phone OTP error:', error);
      }
      setIsLoading(false);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<{ error?: string; success?: string }> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
          },
        },
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Sign up error:', error);
        }
        setIsLoading(false);

        // Provide more specific error messages
        if (error.message.includes('already registered')) {
          return { error: 'This email is already registered. Please sign in instead.' };
        }
        if (error.message.includes('password')) {
          return { error: 'Password must be at least 6 characters long.' };
        }

        return { error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setIsLoading(false);
        return { success: 'Account created! Please check your email to confirm your account.' };
      }

      setIsLoading(false);
      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected sign up error:', error);
      }
      setIsLoading(false);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signOut = async (): Promise<void> => {
    // Clear demo mode if active
    const demoModeStore = useDemoModeStore.getState();
    if (demoModeStore.isDemoMode || demoModeStore.demoView === 'app-preview') {
      demoModeStore.setDemoView('off');
    }

    // Clear onboarding cache to prevent stale data polluting next account
    localStorage.removeItem('chravel_onboarding_completed');

    // Reset onboarding store (dynamic import to avoid circular deps)
    import('@/store/onboardingStore').then(({ useOnboardingStore }) => {
      useOnboardingStore.getState().resetOnboarding();
    });

    // Sign out from Supabase (no-op if not authenticated)
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);

    // Redirect to home/landing page
    window.location.href = '/';
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Reset password error:', error);
        }
        return { error: error.message };
      }

      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected reset password error:', error);
      }
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error?: any }> => {
    if (!user) return { error: 'No user logged in' };

    try {
      // Use UPSERT so profile updates persist even if the profiles row was never created.
      // This is critical for avatar uploads + identity propagation.
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            ...updates,
            user_id: user.id,
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error updating profile:', error);
        }
        return { error };
      }

      // Update local user state
      const updatedUser = { ...user };
      // Prefer returned row to avoid local/remote drift.
      if (data) {
        updatedUser.displayName = data.display_name ?? updatedUser.displayName;
        updatedUser.realName = data.real_name ?? updatedUser.realName;
        updatedUser.namePreference =
          (data.name_preference === 'real' ? 'real' : 'display') ?? updatedUser.namePreference;
        updatedUser.firstName = data.first_name ?? updatedUser.firstName;
        updatedUser.lastName = data.last_name ?? updatedUser.lastName;
        updatedUser.avatar = data.avatar_url ?? updatedUser.avatar;
        updatedUser.bio = data.bio ?? updatedUser.bio;
        updatedUser.phone = data.phone ?? updatedUser.phone;
        updatedUser.showEmail = data.show_email ?? updatedUser.showEmail;
        updatedUser.showPhone = data.show_phone ?? updatedUser.showPhone;
      } else {
        if (updates.display_name) updatedUser.displayName = updates.display_name;
        if (updates.real_name !== undefined) updatedUser.realName = updates.real_name ?? undefined;
        if (updates.name_preference !== undefined)
          updatedUser.namePreference = updates.name_preference === 'real' ? 'real' : 'display';
        if (updates.first_name) updatedUser.firstName = updates.first_name;
        if (updates.last_name) updatedUser.lastName = updates.last_name;
        if (updates.avatar_url) updatedUser.avatar = updates.avatar_url;
        if (updates.bio !== undefined) updatedUser.bio = updates.bio ?? undefined;
        if (updates.phone !== undefined) updatedUser.phone = updates.phone ?? undefined;
        if (updates.show_email !== undefined) updatedUser.showEmail = updates.show_email;
        if (updates.show_phone !== undefined) updatedUser.showPhone = updates.show_phone;
      }

      setUser(updatedUser);
      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating profile:', error);
      }
      return { error };
    }
  };

  const updateNotificationSettings = async (
    updates: Partial<User['notificationSettings']>,
  ): Promise<void> => {
    if (!user) return;

    try {
      // Map User notificationSettings to NotificationPreferences format
      const prefsUpdate = {
        chat_messages: updates.messages,
        broadcasts: updates.broadcasts,
        calendar_reminders: updates.tripUpdates,
        email_enabled: updates.email,
        push_enabled: updates.push,
      };

      // Save to database using userPreferencesService
      const { userPreferencesService } = await import('@/services/userPreferencesService');
      await userPreferencesService.updateNotificationPreferences(user.id, prefsUpdate);

      // Update local user state
      const updatedUser = {
        ...user,
        notificationSettings: {
          ...user.notificationSettings,
          ...updates,
        },
      };

      setUser(updatedUser);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating notification settings:', error);
      }
    }
  };

  const switchRole = (role: string) => {
    if (user) {
      const rolePermissions: Record<string, string[]> = {
        admin: ['read', 'write', 'admin', 'finance', 'compliance'],
        staff: ['read', 'write'],
        talent: ['read'],
        player: ['read'],
        crew: ['read', 'write'],
        security: ['read', 'write'],
        medical: ['read', 'write', 'medical'],
        producer: ['read', 'write', 'admin'],
        speakers: ['read'],
        guests: ['read'],
        coordinators: ['read', 'write'],
        logistics: ['read', 'write'],
        press: ['read', 'write'],
      };

      setUser({
        ...user,
        proRole: role as User['proRole'],
        permissions: rolePermissions[role] || ['read'],
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signInWithGoogle,
        signInWithPhone,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        updateNotificationSettings,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
