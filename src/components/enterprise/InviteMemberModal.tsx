import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

type OrgRole = 'admin' | 'member';

export const InviteMemberModal = ({ open, onClose, organizationId }: InviteMemberModalProps) => {
  const { inviteMember } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Missing email',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await inviteMember(organizationId, email, role);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${email}`,
      });
      onClose();
      setEmail('');
      setRole('member');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md bg-gray-900 border-white/10"
        aria-label="Invite team member"
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail size={20} className="text-glass-orange" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Invite member form">
          <div>
            <Label htmlFor="invite-email" className="text-gray-300">
              Email Address
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white min-h-[44px]"
              placeholder="colleague@example.com"
              aria-label="Invitee email address"
              required
            />
          </div>

          <div>
            <Label htmlFor="invite-role" className="text-gray-300">
              Role
            </Label>
            <Select value={role} onValueChange={v => setRole(v as OrgRole)}>
              <SelectTrigger
                className="bg-gray-800/50 border-gray-600 text-white min-h-[44px]"
                aria-label="Select member role"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="member" className="text-white min-h-[44px]">
                  Member
                </SelectItem>
                <SelectItem value="admin" className="text-white min-h-[44px]">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1" id="role-description">
              {role === 'admin'
                ? 'Can manage members and organization settings'
                : 'Can view and participate in trips'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 min-h-[44px]"
              disabled={loading}
              aria-label="Cancel invitation"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-glass-orange hover:bg-glass-orange/80 min-h-[44px]"
              disabled={loading}
              aria-label={loading ? 'Sending invitation' : 'Send invitation'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
