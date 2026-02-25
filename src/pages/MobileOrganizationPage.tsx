import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganization } from '@/hooks/useOrganization';
import { MobileTeamMemberCard } from '@/components/mobile/MobileTeamMemberCard';
import { InviteMemberModal } from '@/components/enterprise/InviteMemberModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export const MobileOrganizationPage = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { organizations, members, loading, fetchOrgMembers, updateMemberRole, removeMember } =
    useOrganization();

  // Fetch members when orgId changes
  React.useEffect(() => {
    if (orgId) {
      fetchOrgMembers(orgId);
    }
  }, [orgId]);

  const organization = organizations.find(org => org.id === orgId);

  if (!isMobile) {
    navigate('/settings');
    return null;
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const result = await updateMemberRole(memberId, newRole as 'admin' | 'member');
      if (result.error) throw result.error;

      toast({
        title: 'Role updated',
        description: 'Team member role has been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const result = await removeMember(memberId);
      if (result.error) throw result.error;

      toast({
        title: 'Member removed',
        description: 'Team member has been removed from the organization',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <p className="text-muted-foreground text-center mt-8">Organization not found</p>
      </div>
    );
  }

  const currentUserMember = members.find(m => m.role === 'owner' || m.role === 'admin');
  const canManageMembers =
    currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Organization</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Organization Info */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 border border-primary/20">
          <h2 className="text-2xl font-bold text-foreground mb-2">{organization.name}</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="uppercase font-medium text-primary">
              {organization.subscription_tier}
            </span>
            <span>•</span>
            <span>
              {organization.seats_used} / {organization.seat_limit} seats
            </span>
          </div>
        </div>

        {/* Team Members Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
            {canManageMembers && (
              <Button size="sm" onClick={() => setShowInviteModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Invite
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No team members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map(member => (
                <MobileTeamMemberCard
                  key={member.id}
                  member={member}
                  onChangeRole={
                    canManageMembers ? userId => handleChangeRole(member.id, userId) : undefined
                  }
                  onRemove={canManageMembers ? () => handleRemove(member.id) : undefined}
                  isOwner={member.role === 'owner'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <InviteMemberModal
        open={showInviteModal}
        organizationId={orgId || ''}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
};
