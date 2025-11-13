import React, { useState } from 'react';
import { useTripAdmins } from '@/hooks/useTripAdmins';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, Crown, UserPlus, X, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { supabase } from '@/integrations/supabase/client';

interface AdminManagerProps {
  tripId: string;
  tripCreatorId: string;
}

export const AdminManager: React.FC<AdminManagerProps> = ({ tripId, tripCreatorId }) => {
  const { admins, isLoading, isProcessing, promoteToAdmin, demoteFromAdmin } = useTripAdmins({ 
    tripId 
  });
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState<string | null>(null);
  const [confirmDemote, setConfirmDemote] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const { data } = await supabase
          .from('trip_members')
          .select(`
            user_id,
            profiles:user_id(display_name, avatar_url, email)
          `)
          .eq('trip_id', tripId);

        // Filter out users who are already admins
        const adminIds = admins.map(a => a.user_id);
        const nonAdmins = (data || []).filter(
          m => !adminIds.includes(m.user_id)
        );

        setMembers(nonAdmins);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    if (tripId && admins.length > 0) {
      fetchMembers();
    }
  }, [tripId, admins]);

  const handlePromote = async () => {
    if (!confirmPromote) return;
    await promoteToAdmin(confirmPromote);
    setConfirmPromote(null);
    setSelectedMember('');
  };

  const handleDemote = async () => {
    if (!confirmDemote) return;
    await demoteFromAdmin(confirmDemote);
    setConfirmDemote(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading admins...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">Admin Management</h3>
          <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">
            {admins.length}
          </span>
        </div>
      </div>

      {/* Current Admins List */}
      <div className="space-y-3 mb-6">
        {admins.map((admin) => {
          const isCreator = admin.user_id === tripCreatorId;
          
          return (
            <div
              key={admin.id}
              className="flex items-center justify-between p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/10">
                  <AvatarImage src={admin.profile?.avatar_url} />
                  <AvatarFallback className="bg-blue-500/20 text-blue-500 text-sm">
                    {admin.profile?.display_name?.[0]?.toUpperCase() || 
                     admin.profile?.email?.[0]?.toUpperCase() || 
                     'A'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">
                      {admin.profile?.display_name || admin.profile?.email || 'Unknown User'}
                    </span>
                    {isCreator && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isCreator ? 'Trip Creator' : 'Admin'}
                  </span>
                </div>
              </div>

              {!isCreator && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDemote(admin.user_id)}
                  disabled={isProcessing}
                  className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 h-9 px-4"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Admin */}
      <div className="pt-6 border-t border-white/10">
        <p className="text-sm text-muted-foreground mb-3">Promote Member to Admin</p>
        <div className="flex gap-2">
          <Select
            value={selectedMember}
            onValueChange={setSelectedMember}
            disabled={loadingMembers || members.length === 0}
          >
            <SelectTrigger className="flex-1 rounded-full bg-white/5 border-white/10">
              <SelectValue placeholder={
                loadingMembers ? 'Loading members...' : 
                members.length === 0 ? 'All members are admins' : 
                'Select a member'
              } />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles?.display_name || member.profiles?.email || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setConfirmPromote(selectedMember)}
            disabled={!selectedMember || isProcessing}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Promote
          </Button>
        </div>
      </div>

      {/* Promotion Confirmation Dialog */}
      <AlertDialog open={!!confirmPromote} onOpenChange={(open) => !open && setConfirmPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Promote to Admin?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This member will gain admin privileges including:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Ability to manage roles and channels</li>
                <li>Permission to assign roles to members</li>
                <li>Access to admin dashboard</li>
              </ul>
              <p className="text-yellow-500 flex items-center gap-1 mt-3">
                <AlertTriangle className="w-4 h-4" />
                Only the trip creator can revoke admin permissions.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePromote}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demotion Confirmation Dialog */}
      <AlertDialog open={!!confirmDemote} onOpenChange={(open) => !open && setConfirmDemote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Demote from Admin?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This admin will lose the following privileges:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Ability to manage roles and channels</li>
                <li>Permission to assign roles to members</li>
                <li>Access to admin dashboard</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                They will remain a trip member but without admin rights.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDemote}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Demotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
