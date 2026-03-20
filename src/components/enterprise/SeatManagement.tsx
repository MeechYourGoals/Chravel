import { useEffect, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InviteMemberModal } from './InviteMemberModal';
import { UserPlus, Users, Shield, User as UserIcon, UserMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MemberWithProfile {
  id: string;
  seat_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  joined_at: string;
  user_id?: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export const SeatManagement = () => {
  const {
    currentOrg,
    members,
    fetchOrgMembers,
    removeMember,
    updateMemberRole: _updateMemberRole,
  } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [membersWithProfiles, setMembersWithProfiles] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Confirmation dialog state
  const [removeConfirm, setRemoveConfirm] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);

  useEffect(() => {
    if (currentOrg) {
      fetchOrgMembers(currentOrg.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchOrgMembers stability unknown from hook
  }, [currentOrg]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (members.length === 0) {
        setMembersWithProfiles([]);
        setLoading(false);
        return;
      }

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, resolved_display_name, avatar_url')
        .in('user_id', userIds);

      const enriched: MemberWithProfile[] = members.map(member => {
        const profile = profiles?.find(p => p.user_id === member.user_id);
        const displayName = profile?.resolved_display_name || profile?.display_name || 'Unknown';
        return {
          ...member,
          profile: profile
            ? { display_name: displayName, avatar_url: profile.avatar_url ?? undefined }
            : undefined,
        };
      });

      setMembersWithProfiles(enriched);
      setLoading(false);
    };

    fetchProfiles();
  }, [members]);

  if (!currentOrg) return null;

  const seatUsage = (currentOrg.seats_used / currentOrg.seat_limit) * 100;
  const isOwner = members.find(m => m.user_id === user?.id)?.role === 'owner';

  const handleRemoveConfirm = (memberId: string, memberName: string) => {
    setRemoveConfirm({ memberId, memberName });
  };

  const handleRemoveMember = async () => {
    if (!removeConfirm) return;

    setRemovingMemberId(removeConfirm.memberId);
    const { error } = await removeMember(removeConfirm.memberId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Member Removed',
        description: `${removeConfirm.memberName} has been removed from the organization.`,
      });
    }

    setRemovingMemberId(null);
    setRemoveConfirm(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield size={14} className="text-yellow-500" />;
      case 'admin':
        return <Shield size={14} className="text-blue-500" />;
      default:
        return <UserIcon size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Remove member confirmation dialog */}
      <AlertDialog
        open={removeConfirm !== null}
        onOpenChange={open => {
          if (!open) setRemoveConfirm(null);
        }}
      >
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <UserMinus size={20} className="text-red-400" />
              Remove Member
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to remove{' '}
              <strong className="text-white">{removeConfirm?.memberName}</strong> from this
              organization? They will lose access to all organization trips and resources. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10 min-h-[44px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={24} />
          Seat Management
        </h3>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-glass-orange hover:bg-glass-orange/80 min-h-[44px]"
          disabled={currentOrg.seats_used >= currentOrg.seat_limit}
          aria-label={
            currentOrg.seats_used >= currentOrg.seat_limit
              ? 'Seat limit reached - upgrade to invite more members'
              : 'Invite a new team member'
          }
        >
          <UserPlus size={16} className="mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Seat Usage */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">Seat Usage</span>
          <span className="text-white font-semibold">
            {currentOrg.seats_used} / {currentOrg.seat_limit}
          </span>
        </div>
        <Progress
          value={seatUsage}
          className="h-2"
          aria-label={`Seat usage: ${currentOrg.seats_used} of ${currentOrg.seat_limit} seats used`}
        />
        {seatUsage > 90 && (
          <p className="text-sm text-orange-400 mt-2" role="alert">
            You're approaching your seat limit. Consider upgrading your plan.
          </p>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h4 className="text-lg font-semibold text-white">
            Team Members ({loading ? '...' : membersWithProfiles.length})
          </h4>
        </div>

        <div className="divide-y divide-white/10">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
                    <div>
                      <Skeleton className="h-5 w-32 bg-white/10 mb-1" />
                      <Skeleton className="h-4 w-20 bg-white/10" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
                </div>
              ))}
            </div>
          ) : membersWithProfiles.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={48} className="text-gray-600 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-white mb-1">No Team Members</h4>
              <p className="text-sm text-gray-400 mb-4">
                Invite team members to start collaborating on trips
              </p>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-glass-orange hover:bg-glass-orange/80 min-h-[44px]"
                aria-label="Invite your first team member"
              >
                <UserPlus size={16} className="mr-2" />
                Invite First Member
              </Button>
            </div>
          ) : (
            membersWithProfiles.map(member => (
              <div
                key={member.id}
                className="p-4 hover:bg-white/5 transition-colors"
                role="listitem"
                aria-label={`Team member: ${member.profile?.display_name || 'Unknown'}, role: ${member.role}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={`${member.profile.display_name || 'Member'} avatar`}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-glass-orange/20 flex items-center justify-center">
                        <UserIcon size={20} className="text-glass-orange" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {member.profile?.display_name || 'Unknown'}
                        </span>
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 border-white/20"
                        >
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-400">{member.seat_id}</span>
                    </div>
                  </div>

                  {isOwner && member.role !== 'owner' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRemoveConfirm(
                            member.id,
                            member.profile?.display_name || 'this member',
                          )
                        }
                        disabled={removingMemberId === member.id}
                        className="text-red-400 border-red-400/30 hover:bg-red-400/10 min-h-[44px]"
                        aria-label={`Remove ${member.profile?.display_name || 'member'} from organization`}
                      >
                        {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {currentOrg && (
        <InviteMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          organizationId={currentOrg.id}
        />
      )}
    </div>
  );
};
