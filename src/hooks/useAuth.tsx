import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Trip } from '@/services/tripService';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateNotificationSettings: (updates: Partial<User['notificationSettings']>) => Promise<void>;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Phase 4: Prefetch trips as soon as session is available
  const prefetchedTripsRef = useState<{ data: Trip[] | null; loading: boolean }>({ 
    data: null, 
    loading: false 
  })[0];

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Helper function to transform Supabase user to app User
  const transformUser = useCallback(async (supabaseUser: SupabaseUser, profile?: UserProfile | null): Promise<User> => {
    // CRITICAL: Validate that we have a valid user ID before proceeding
    if (!supabaseUser || !supabaseUser.id) {
      console.error('[transformUser] Invalid Supabase user - missing ID', { supabaseUser });
      throw new Error('Invalid Supabase user - missing ID');
    }
    
    const userProfile = profile || await fetchUserProfile(supabaseUser.id);
    
    // Query user_roles table for actual roles (security fix - never trust client-side role assignment)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', supabaseUser.id);
    
    const roles = userRoles?.map(r => r.role) || [];
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
    
    // Get organization membership for proRole
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', supabaseUser.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();
    
    // Map org member role to proRole type (owner/admin maps to admin, otherwise undefined)
    let proRole: User['proRole'] = undefined;
    if (orgMember?.role === 'owner' || orgMember?.role === 'admin') {
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
      isPro,
      showEmail: userProfile?.show_email || false,
      showPhone: userProfile?.show_phone || false,
      proRole,
      organizationId: orgMember?.organization_id || undefined,
      permissions,
      notificationSettings: {
        messages: true,
        broadcasts: true,
        tripUpdates: true,
        email: true,
        push: false
      }
    };
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Phase 4: Helper to prefetch trips immediately when session is available
    const prefetchTrips = async () => {
      if (prefetchedTripsRef.loading || prefetchedTripsRef.data !== null) return;
      
      prefetchedTripsRef.loading = true;
      try {
        const { tripService } = await import('@/services/tripService');
        const trips = await tripService.getUserTrips();
        if (mounted) {
          prefetchedTripsRef.data = trips;
        }
      } catch (error) {
        console.error('Error prefetching trips:', error);
      } finally {
        prefetchedTripsRef.loading = false;
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        
        if (session?.user) {
          // Phase 4: Start prefetching trips immediately
          prefetchTrips();
          
          setTimeout(async () => {
            if (!mounted) return;
            const transformedUser = await transformUser(session.user);
            setUser(transformedUser);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      if (session?.user) {
        // Phase 4: Start prefetching trips immediately
        prefetchTrips();
        
        transformUser(session.user).then(transformedUser => {
          if (mounted) {
            setUser(transformedUser);
            setIsLoading(false);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [transformUser]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      return {};
    } catch (error) {
      setIsLoading(false);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signInWithPhone = async (phone: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      setIsLoading(false);
      return {};
    } catch (error) {
      setIsLoading(false);
      return { error: 'An unexpected error occurred' };
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
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
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
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
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
        setIsLoading(false);
        return { error: error.message };
      }

      setIsLoading(false);
      return {};
    } catch (error) {
      setIsLoading(false);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      // Update local user state
      const updatedUser = { ...user };
      if (updates.display_name) updatedUser.displayName = updates.display_name;
      if (updates.first_name) updatedUser.firstName = updates.first_name;
      if (updates.last_name) updatedUser.lastName = updates.last_name;
      if (updates.avatar_url) updatedUser.avatar = updates.avatar_url;
      if (updates.show_email !== undefined) updatedUser.showEmail = updates.show_email;
      if (updates.show_phone !== undefined) updatedUser.showPhone = updates.show_phone;

      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const updateNotificationSettings = async (updates: Partial<User['notificationSettings']>): Promise<void> => {
    if (!user) return;

    try {
      // For now, we'll just update the local state
      // In a real app, you'd also update the user_preferences table
      const updatedUser = {
        ...user,
        notificationSettings: {
          ...user.notificationSettings,
          ...updates
        }
      };

      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating notification settings:', error);
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