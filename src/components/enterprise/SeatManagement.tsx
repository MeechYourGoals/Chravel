import { useEffect, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InviteMemberModal } from './InviteMemberModal';
import { UserPlus, Users, Shield, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MemberWithProfile {
  id: string;
  seat_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  joined_at: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export const SeatManagement = () => {
  const { currentOrg, members, fetchOrgMembers, removeMember, updateMemberRole } = useOrganization();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [membersWithProfiles, setMembersWithProfiles] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      fetchOrgMembers(currentOrg.id);
    }
  }, [currentOrg]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (members.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, resolved_display_name, avatar_url')
        .in('user_id', userIds);

      const enriched = members.map(member => {
        const profile = profiles?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          profile: profile ? {
            ...profile,
            display_name: profile.resolved_display_name || profile.display_name,
          } : undefined,
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield size={14} className="text-yellow-500" />;
      case 'admin': return <Shield size={14} className="text-blue-500" />;
      default: return <UserIcon size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={24} />
          Seat Management
        </h3>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-glass-orange hover:bg-glass-orange/80"
          disabled={currentOrg.seats_used >= currentOrg.seat_limit}
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
        <Progress value={seatUsage} className="h-2" />
        {seatUsage > 90 && (
          <p className="text-sm text-orange-400 mt-2">
            You're approaching your seat limit. Consider upgrading your plan.
          </p>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h4 className="text-lg font-semibold text-white">Team Members ({membersWithProfiles.length})</h4>
        </div>
        
        <div className="divide-y divide-white/10">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading members...</div>
          ) : membersWithProfiles.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No members yet</div>
          ) : (
            membersWithProfiles.map((member) => (
              <div key={member.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.profile?.avatar_url ? (
                      <img 
                        src={member.profile.avatar_url} 
                        alt="" 
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
                        <Badge variant="outline" className="flex items-center gap-1 border-white/20">
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
                        onClick={() => removeMember(member.id)}
                        className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                      >
                        Remove
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
