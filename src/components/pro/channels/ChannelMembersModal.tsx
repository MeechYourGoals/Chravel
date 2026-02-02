import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Shield } from 'lucide-react';
import { Button } from '../../ui/button';
import { ChannelWithStats } from '../../../types/channels';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChannelMember {
  id: string;
  user_id: string;
  joined_at: string;
  is_muted: boolean;
  last_read_at?: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ChannelMembersModalProps {
  channel: ChannelWithStats;
  onClose: () => void;
  isAdmin: boolean;
}

export const ChannelMembersModal: React.FC<ChannelMembersModalProps> = ({
  channel,
  onClose,
  isAdmin
}) => {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, [channel.id]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          id,
          user_id,
          joined_at,
          is_muted,
          last_read_at,
          user:user_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('channel_id', channel.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      setMembers((data as any) || []);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin) return;

    try {
      setRemovingUserId(userId);
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)
        .eq('user_id', userId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.user_id !== userId));
      toast.success('Member removed from channel');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Channel Members ({members.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No members in this channel yet
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                    {member.user?.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt={member.user.display_name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (member.user?.display_name?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {member.user?.display_name || 'Former Member'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingUserId === member.user_id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {removingUserId === member.user_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    ) : (
                      <UserMinus size={16} />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <Button className="w-full bg-primary hover:bg-primary/90" disabled>
            <UserPlus size={16} className="mr-2" />
            Add Members (Coming Soon)
          </Button>
        )}
      </div>
    </div>
  );
};
