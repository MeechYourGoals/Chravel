import { useState, useCallback } from 'react';
import { ProParticipant } from '../types/pro';

export interface BulkRoleAssignmentResult {
  success: boolean;
  assignedCount: number;
  errors?: string[];
}

export const useBulkRoleAssignment = () => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId],
    );
  }, []);

  const selectAll = useCallback((memberIds: string[]) => {
    setSelectedMembers(memberIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMembers([]);
  }, []);

  const selectByRole = useCallback((roster: ProParticipant[], role: string) => {
    const memberIds = roster.filter(member => member.role === role).map(member => member.id);
    setSelectedMembers(memberIds);
  }, []);

  const assignRoleToMultiple = useCallback(
    async (
      memberIds: string[],
      roleId: string,
      roleName: string,
      onUpdateMemberRole: (memberId: string, roleId: string, roleName: string) => Promise<void>,
    ): Promise<BulkRoleAssignmentResult> => {
      setIsAssigning(true);
      const errors: string[] = [];
      let assignedCount = 0;

      try {
        // Process assignments sequentially to avoid overwhelming the backend
        for (const memberId of memberIds) {
          try {
            await onUpdateMemberRole(memberId, roleId, roleName);
            assignedCount++;
          } catch (error) {
            console.error(`Failed to assign role to member ${memberId}:`, error);
            errors.push(`Failed to assign role to member ${memberId}`);
          }
        }

        return {
          success: errors.length === 0,
          assignedCount,
          errors: errors.length > 0 ? errors : undefined,
        };
      } finally {
        setIsAssigning(false);
        clearSelection();
      }
    },
    [clearSelection],
  );

  return {
    selectedMembers,
    toggleMember,
    selectAll,
    clearSelection,
    selectByRole,
    assignRoleToMultiple,
    isAssigning,
  };
};
