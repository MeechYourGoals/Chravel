import { useState, useCallback, useMemo } from 'react';

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  status?: 'active' | 'pending' | 'invited';
}

export interface InviteMemberData {
  email: string;
  role?: string;
  tripId: string;
}

export const useCollaboratorManagement = () => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId],
    );
  }, []);

  const selectAllMembers = useCallback((memberIds: string[]) => {
    setSelectedMembers(memberIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMembers([]);
  }, []);

  const filterMembers = useCallback(
    (members: Collaborator[], options?: { includeInactive?: boolean }): Collaborator[] => {
      let filtered = members;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          member =>
            member.name.toLowerCase().includes(query) ||
            member.email?.toLowerCase().includes(query) ||
            member.role?.toLowerCase().includes(query),
        );
      }

      // Filter by role
      if (roleFilter) {
        filtered = filtered.filter(member => member.role === roleFilter);
      }

      // Filter by status
      if (!options?.includeInactive) {
        filtered = filtered.filter(member => member.status === 'active');
      }

      return filtered;
    },
    [searchQuery, roleFilter],
  );

  const getMembersByRole = useCallback((members: Collaborator[], role: string): Collaborator[] => {
    return members.filter(member => member.role === role);
  }, []);

  const getUniqueRoles = useCallback((members: Collaborator[]): string[] => {
    const roles = members.map(m => m.role).filter((role): role is string => !!role);
    return [...new Set(roles)].sort();
  }, []);

  const validateInvitation = useCallback(
    (
      email: string,
    ): {
      isValid: boolean;
      error?: string;
    } => {
      if (!email.trim()) {
        return { isValid: false, error: 'Email is required' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Invalid email format' };
      }

      return { isValid: true };
    },
    [],
  );

  const checkPermission = useCallback(
    (userId: string, members: Collaborator[], requiredRole?: string): boolean => {
      const member = members.find(m => m.id === userId);

      if (!member) return false;
      if (member.status !== 'active') return false;
      if (!requiredRole) return true;

      return member.role === requiredRole;
    },
    [],
  );

  return {
    // State
    selectedMembers,
    searchQuery,
    roleFilter,

    // Computed
    hasSelection: selectedMembers.length > 0,
    selectionCount: selectedMembers.length,

    // Actions
    toggleMember,
    selectAllMembers,
    clearSelection,
    setSearchQuery,
    setRoleFilter,
    filterMembers,
    getMembersByRole,
    getUniqueRoles,
    validateInvitation,
    checkPermission,
  };
};
