import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';

export interface Organization {
  id: string;
  name: string;
  display_name: string;
  subscription_tier: 'starter' | 'growing' | 'enterprise' | 'enterprise-plus';
  subscription_status: 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended';
  seat_limit: number;
  seats_used: number;
  billing_email?: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  seat_id: string;
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

export const useOrganization = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserOrganizations = useCallback(async () => {
    try {
      setLoading(true);

      // 🎯 CRITICAL: Demo mode NEVER queries Supabase
      setError(null);
      if (isDemoMode) {
        setOrganizations([]);
        setCurrentOrg(null);
        setLoading(false);
        return;
      }

      if (!user || !user.id) {
        console.warn('[useOrganization] No user ID available, skipping org fetch');
        setOrganizations([]);
        setCurrentOrg(null);
        setLoading(false);
        return;
      }

      // Fetch user's organization memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id) // Now guaranteed to be defined
        .eq('status', 'active');

      if (membershipsError) throw membershipsError;

      if (memberships && memberships.length > 0) {
        const orgIds = memberships.map(m => m.organization_id);

        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);

        if (orgsError) throw orgsError;

        setOrganizations((orgs as Organization[]) || []);
        if (orgs && orgs.length > 0) {
          setCurrentOrg(orgs[0] as Organization);
        }
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err : new Error('Failed to load organizations'));
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setOrganizations([]);
      setCurrentOrg(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (user) {
      fetchUserOrganizations();
    } else {
      setLoading(false);
    }
  }, [user, isDemoMode, fetchUserOrganizations]);

  const fetchOrgMembers = useCallback(async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers((data as OrganizationMember[]) || []);
    } catch (error) {
      console.error('Error fetching org members:', error);
    }
  }, []);

  const createOrganization = async (data: {
    name: string;
    display_name: string;
    billing_email: string;
  }) => {
    try {
      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      await fetchUserOrganizations();
      return { data: newOrg, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const inviteMember = async (orgId: string, email: string, role: 'admin' | 'member') => {
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { data, error } = await supabase
        .from('organization_invites')
        .insert([
          {
            organization_id: orgId,
            email,
            invited_by: user?.id,
            role,
            token,
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('organization_members').delete().eq('id', memberId);

      if (error) throw error;

      if (currentOrg) {
        await fetchOrgMembers(currentOrg.id);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      if (currentOrg) {
        await fetchOrgMembers(currentOrg.id);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    organizations,
    currentOrg,
    setCurrentOrg,
    members,
    loading,
    error,
    fetchUserOrganizations,
    fetchOrgMembers,
    createOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
};
