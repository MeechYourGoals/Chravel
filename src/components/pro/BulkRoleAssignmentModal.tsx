import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import {
  Users, Check, X, Search, Filter, ChevronRight, CheckCircle2, AlertCircle, Shield
} from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { useBulkRoleAssignment } from '../../hooks/useBulkRoleAssignment';
import { useTripAdmins } from '../../hooks/useTripAdmins';
import { getRoleColorClass } from '../../utils/roleUtils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '../../utils/avatarUtils';
import { TripRole } from '../../types/roleChannels';

interface BulkRoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: ProParticipant[];
  category: ProTripCategory;
  existingRoles: string[];
  availableRoles?: TripRole[];
  onUpdateMemberRole: (memberId: string, newRole: string) => Promise<void>;
  tripId?: string;
}

type Step = 'select' | 'assign' | 'confirm';

export const BulkRoleAssignmentModal = ({
  isOpen,
  onClose,
  roster,
  category,
  existingRoles,
  availableRoles = [],
  onUpdateMemberRole,
  tripId
}: BulkRoleAssignmentModalProps) => {
  const [step, setStep] = useState<Step>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByRole, setFilterByRole] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [result, setResult] = useState<{ success: boolean; assignedCount: number; adminCount?: number } | null>(null);
  const [grantAdminAccess, setGrantAdminAccess] = useState(false);

  const {
    selectedMembers,
    toggleMember,
    selectAll,
    clearSelection,
    selectByRole,
    assignRoleToMultiple,
    isAssigning
  } = useBulkRoleAssignment();

  // Only fetch admins if we have a tripId (for admin promotion feature)
  const { admins, promoteToAdmin, isProcessing: isPromotingAdmin } = useTripAdmins({ 
    tripId: tripId || '', 
    enabled: !!tripId 
  });

  // Get list of current admin user IDs for UI display
  const adminUserIds = new Set(admins.map(a => a.user_id));

  // Count how many selected members are not already admins
  const nonAdminSelectedCount = selectedMembers.filter(
    memberId => !adminUserIds.has(memberId)
  ).length;

  // Get actual trip roles - these are the only roles that can be assigned
  // "Predefined" now means "existing trip roles", not category-based defaults
  const tripRoleNames = availableRoles.map(r => r.roleName);

  // Filter roster based on search and role filter
  const filteredRoster = useMemo(() => {
    let filtered = roster;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (filterByRole !== 'all') {
      filtered = filtered.filter(member => member.role === filterByRole);
    }

    return filtered;
  }, [roster, searchQuery, filterByRole]);

  const selectedMemberDetails = useMemo(() => {
    return roster.filter(member => selectedMembers.includes(member.id));
  }, [roster, selectedMembers]);

  const handleSelectAll = () => {
    selectAll(filteredRoster.map(m => m.id));
  };

  const handleNext = () => {
    if (step === 'select') {
      setStep('assign');
    } else if (step === 'assign') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('assign');
    } else if (step === 'assign') {
      setStep('select');
    }
  };

  const handleAssign = async () => {
    if (!selectedRole.trim()) return;

    const roleResult = await assignRoleToMultiple(
      selectedMembers,
      selectedRole.trim(),
      onUpdateMemberRole
    );

    // If admin checkbox is checked and we have a tripId, promote selected members to admin
    let adminCount = 0;
    if (grantAdminAccess && tripId) {
      const membersToPromote = selectedMembers.filter(
        memberId => !adminUserIds.has(memberId)
      );
      
      if (membersToPromote.length > 0) {
        const adminPromises = membersToPromote.map(memberId =>
          promoteToAdmin(memberId).then(() => true).catch(err => {
            console.warn(`Failed to promote member ${memberId} to admin:`, err);
            return false;
          })
        );
        const results = await Promise.all(adminPromises);
        adminCount = results.filter(Boolean).length;
      }
    }

    setResult({ ...roleResult, adminCount: grantAdminAccess ? adminCount : undefined });
  };

  const handleClose = () => {
    setStep('select');
    setSearchQuery('');
    setFilterByRole('all');
    setSelectedRole('');
    setIsCustomRole(false);
    setResult(null);
    setGrantAdminAccess(false);
    clearSelection();
    onClose();
  };

  const isSubmitting = isAssigning || isPromotingAdmin;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            Bulk Role Assignment
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-2 ${step === 'select' ? 'text-red-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step !== 'select' ? 'bg-red-600' : 'bg-red-600/20'
            }`}>
              {step !== 'select' ? <Check size={16} /> : '1'}
            </div>
            <span className="text-sm font-medium">Select Members</span>
          </div>
          <ChevronRight size={20} className="text-gray-600" />
          <div className={`flex items-center gap-2 ${step === 'assign' ? 'text-red-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'confirm' ? 'bg-red-600' : step === 'assign' ? 'bg-red-600/20' : 'bg-gray-700'
            }`}>
              {step === 'confirm' ? <Check size={16} /> : '2'}
            </div>
            <span className="text-sm font-medium">Choose Role</span>
          </div>
          <ChevronRight size={20} className="text-gray-600" />
          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-red-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'confirm' ? 'bg-red-600/20' : 'bg-gray-700'
            }`}>
              3
            </div>
            <span className="text-sm font-medium">Confirm</span>
          </div>
        </div>

        {/* Step 1: Select Members */}
        {step === 'select' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <Select value={filterByRole} onValueChange={setFilterByRole}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-600">
                  <Filter size={16} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Roles</SelectItem>
                  {existingRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Select All ({filteredRoster.length})
              </Button>
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={selectedMembers.length === 0}
              >
                Clear Selection
              </Button>
            </div>

            {/* Selected Count */}
            {selectedMembers.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm font-medium">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {/* Member List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredRoster.map(member => {
                const isAlreadyAdmin = adminUserIds.has(member.id);
                return (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMembers.includes(member.id)
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-white/5 border-gray-700 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
                    />
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.name}</p>
                        {isAlreadyAdmin && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{member.email}</p>
                    </div>
                    <span className={`${getRoleColorClass(member.role, category)} px-2 py-1 rounded text-xs font-medium`}>
                      {member.role}
                    </span>
                  </label>
                );
              })}
            </div>

            {filteredRoster.length === 0 && (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No members found</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Role */}
        {step === 'assign' && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Assigning role to:</p>
              <p className="text-lg font-medium">{selectedMembers.length} selected member{selectedMembers.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Role Type Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Role Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isCustomRole ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsCustomRole(false);
                    setSelectedRole(tripRoleNames[0] || '');
                  }}
                  disabled={tripRoleNames.length === 0}
                  className="flex-1"
                >
                  Predefined
                </Button>
                <Button
                  type="button"
                  variant={isCustomRole ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsCustomRole(true);
                    setSelectedRole('');
                  }}
                  className="flex-1"
                >
                  Custom
                </Button>
              </div>
            </div>

            {/* Role Selection - Only shows actual trip roles, not category-based defaults */}
            {!isCustomRole && tripRoleNames.length > 0 ? (
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {tripRoleNames.map(role => (
                    <SelectItem key={role} value={role} className="text-white hover:bg-gray-700">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : !isCustomRole && tripRoleNames.length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  No roles exist yet. Use the "Custom" option to create a new role, or create roles first using the "Create Role" button.
                </p>
              </div>
            ) : (
              <Input
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                placeholder="Enter custom role (e.g., Assistant Tour Manager)"
                className="bg-gray-800 border-gray-600 text-white"
              />
            )}

            {/* Admin Access Checkbox - Only show if tripId is provided */}
            {tripId && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-4">
                <Checkbox
                  id="grant-admin-modal"
                  checked={grantAdminAccess}
                  onCheckedChange={(checked) => setGrantAdminAccess(checked === true)}
                  className="mt-0.5 border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="grant-admin-modal"
                    className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-blue-400" />
                    Also grant Admin access
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">
                    Admins can manage roles, channels, and approve join requests
                  </p>
                  {grantAdminAccess && selectedMembers.length > 0 && (
                    <p className="text-xs text-blue-400 mt-2">
                      {nonAdminSelectedCount === 0 
                        ? '✓ All selected members are already admins'
                        : `Will grant admin access to ${nonAdminSelectedCount} member${nonAdminSelectedCount !== 1 ? 's' : ''}`
                      }
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && !result && (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-yellow-400">Confirm Bulk Assignment</p>
                  <p className="text-sm text-gray-300 mt-1">
                    You are about to assign the role <span className="font-bold text-white">"{selectedRole}"</span> to <span className="font-bold text-white">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Members */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className="text-sm text-gray-400">Members to update:</Label>
              {selectedMemberDetails.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-gray-700">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{member.role}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-red-400 font-medium">{selectedRole}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-lg p-4 ${
            result.success 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="text-green-400" size={24} />
              ) : (
                <AlertCircle className="text-red-400" size={24} />
              )}
              <div>
                <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'Assignment Complete!' : 'Assignment Partially Complete'}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Successfully assigned role to {result.assignedCount} member{result.assignedCount !== 1 ? 's' : ''}.
                  {result.adminCount !== undefined && result.adminCount > 0 && (
                    <span className="block mt-1">
                      <Shield className="inline w-3 h-3 mr-1" />
                      Granted admin access to {result.adminCount} member{result.adminCount !== 1 ? 's' : ''}.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-700">
          {!result && step !== 'select' && (
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            onClick={result ? handleClose : handleClose}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            <X size={16} className="mr-1" />
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            step === 'confirm' ? (
              <Button
                onClick={handleAssign}
                disabled={isSubmitting || !selectedRole.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>{grantAdminAccess ? 'Assigning & Promoting...' : 'Assigning...'}</>
                ) : (
                  <>
                    {grantAdminAccess && <Shield size={16} className="mr-1" />}
                    <Check size={16} className="mr-1" />
                    Assign to {selectedMembers.length}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 'select' && selectedMembers.length === 0) ||
                  (step === 'assign' && !selectedRole.trim())
                }
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

