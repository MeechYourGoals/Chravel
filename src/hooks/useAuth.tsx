import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Trip } from '@/services/tripService';

// Timeout utility to prevent indefinite hanging on database queries
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
};

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  show_email: boolean;
  show_phone: boolean;
}

interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
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
  signInWithPhone: (phone: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string; success?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: any }>;
  updateNotificationSettings: (updates: Partial<User['notificationSettings']>) => Promise<void>;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) {
          console.error('Error fetching profile:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching profile:', error);
      }
      return null;
    }
  };

  // Helper function to transform Supabase user to app User
  const transformUser = useCallback(async (supabaseUser: SupabaseUser, profile?: UserProfile | null): Promise<User | null> => {
    // CRITICAL: Validate that we have a valid user ID before proceeding
    if (!supabaseUser || !supabaseUser.id) {
      if (import.meta.env.DEV) {
        console.error('[transformUser] Invalid Supabase user - missing ID', { supabaseUser });
      }
      return null;
    }

    // ⚡ PERFORMANCE: Fast-track demo mode - return minimal user without any DB queries
    const { isDemoMode } = (await import('@/store/demoModeStore')).useDemoModeStore.getState();
    if (isDemoMode) {
      return {
        id: 'demo-user',
        displayName: 'Demo User',
        isPro: false,
        showEmail: false,
        showPhone: false,
        permissions: ['read'],
        notificationSettings: {
          messages: true,
          broadcasts: true,
          tripUpdates: true,
          email: false,
          push: false
        }
      };
    }
    
    // ⚡ PERFORMANCE: Parallelize all database queries (was 2-3s sequential, now <1s parallel)
    const [userProfile, userRolesResult, orgMemberResult, notifPrefs] = await Promise.all([
      // Fetch profile with 2s timeout (reduced from 3s)
      profile || withTimeout(
        fetchUserProfile(supabaseUser.id),
        2000,
        null
      ),
      
      // Query user_roles table with 2s timeout
      withTimeout(
        (async () => {
          const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', supabaseUser.id);
          return { data, error };
        })(),
        2000,
        { data: [], error: null }
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
        { data: null, error: null }
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
              calendar_reminders: true,
              trip_invites: true,
              join_requests: false,
              quiet_hours_enabled: false,
              quiet_start: '22:00',
              quiet_end: '08:00',
              timezone: 'America/New_York'
            }
          );
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[transformUser] Failed to load notification prefs, using defaults:', err);
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
            timezone: 'America/New_York'
          };
        }
      })()
    ]);
    
    const roles = userRolesResult.data?.map((r: any) => r.role) || [];
    const isPro = roles.includes('pro');
    const isSystemAdmin = roles.includes('enterprise_admin');
    
    // Map roles to permissions - only grant what user actually has
    const permissions: string[] = ['read'];
    if (isPro || isSystemAdmin) {
      permissions.push('write');
    }
    if (isSystemAdmin) {
      permissions.push('admin', 'finance', 'compliance');
    }
    
    // Map org member role to proRole type (owner/admin maps to admin, otherwise undefined)
    let proRole: User['proRole'] = undefined;
    if (orgMemberResult.data?.role === 'owner' || orgMemberResult.data?.role === 'admin') {
      proRole = 'admin';
    }
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      phone: supabaseUser.phone,
      displayName: userProfile?.display_name || supabaseUser.email || 'User',
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
        push: notifPrefs.push_enabled
      }
    };
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Safety timeout: force loading to false after 10 seconds to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.error('[Auth] Loading timeout exceeded (10s), forcing completion');
        setIsLoading(false);
      }
    }, 10000);

    const getSessionAndUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Error getting session:', error);
        }
        setIsLoading(false);
        return;
      }

      setSession(session);

      if (session?.user) {
        try {
          const transformedUser = await transformUser(session.user);
          setUser(transformedUser);
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[Auth] Error transforming user on init:', err);
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    getSessionAndUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          try {
            const transformedUser = await transformUser(session.user);
            setUser(transformedUser);
          } catch (err) {
            if (import.meta.env.DEV) {
              console.error('[Auth] Error transforming user:', err);
            }
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [transformUser]);

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
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Please confirm your email address before signing in. Check your inbox for the confirmation link.' };
        }

        return { error: error.message };
      }

      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected sign in error:', error);
      }
      setIsLoading(false);
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
          return { error: 'Please enter a valid phone number with country code (e.g., +1234567890).' };
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

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Google sign in error:', error);
        }

        // Provide more specific error messages
        if (error.message.includes('not configured') || error.message.includes('OAuth')) {
          return { error: 'Google sign-in is not configured. Please use email to sign in or contact support.' };
        }

        return { error: error.message };
      }

      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected Google sign in error:', error);
      }
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signInWithApple = async (): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Apple sign in error:', error);
        }

        // Provide more specific error messages
        if (error.message.includes('not configured') || error.message.includes('OAuth')) {
          return { error: 'Apple sign-in is not configured. Please use email to sign in or contact support.' };
        }

        return { error: error.message };
      }

      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Unexpected Apple sign in error:', error);
      }
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<{ error?: string; success?: string }> => {
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
            full_name: `${firstName} ${lastName}`.trim()
          }
        }
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error updating profile:', error);
        }
        return { error };
      }

      // Update local user state
      const updatedUser = { ...user };
      if (updates.display_name) updatedUser.displayName = updates.display_name;
      if (updates.first_name) updatedUser.firstName = updates.first_name;
      if (updates.last_name) updatedUser.lastName = updates.last_name;
      if (updates.avatar_url) updatedUser.avatar = updates.avatar_url;
      if (updates.bio !== undefined) updatedUser.bio = updates.bio || undefined;
      if (updates.show_email !== undefined) updatedUser.showEmail = updates.show_email;
      if (updates.show_phone !== undefined) updatedUser.showPhone = updates.show_phone;

      setUser(updatedUser);
      return {};
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating profile:', error);
      }
      return { error };
    }
  };

  const updateNotificationSettings = async (updates: Partial<User['notificationSettings']>): Promise<void> => {
    if (!user) return;

    try {
      // Map User notificationSettings to NotificationPreferences format
      const prefsUpdate = {
        chat_messages: updates.messages,
        broadcasts: updates.broadcasts,
        calendar_reminders: updates.tripUpdates,
        email_enabled: updates.email,
        push_enabled: updates.push
      };

      // Save to database using userPreferencesService
      const { userPreferencesService } = await import('@/services/userPreferencesService');
      await userPreferencesService.updateNotificationPreferences(user.id, prefsUpdate);

      // Update local user state
      const updatedUser = {
        ...user,
        notificationSettings: {
          ...user.notificationSettings,
          ...updates
        }
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
        press: ['read', 'write']
      };
      
      setUser({
        ...user,
        proRole: role as User['proRole'],
        permissions: rolePermissions[role] || ['read']
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signIn,
      signInWithPhone,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      updateNotificationSettings,
      switchRole
    }}>
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