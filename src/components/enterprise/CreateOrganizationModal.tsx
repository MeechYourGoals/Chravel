import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when organization is created successfully (before closing) */
  onSuccess?: () => void;
}

export const CreateOrganizationModal = ({
  open,
  onClose,
  onSuccess,
}: CreateOrganizationModalProps) => {
  const { createOrganization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    billing_email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.billing_email) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await createOrganization({
      ...formData,
      display_name: formData.display_name || formData.name,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create organization',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });
      onSuccess?.();
      onClose();
      setFormData({ name: '', display_name: '', billing_email: '' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Create Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Organization Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white"
              placeholder="Acme Tours"
              required
            />
          </div>

          <div>
            <Label htmlFor="display_name" className="text-gray-300">
              Display Name
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={e => setFormData({ ...formData, display_name: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white"
              placeholder="Acme Tours & Events"
            />
          </div>

          <div>
            <Label htmlFor="billing_email" className="text-gray-300">
              Billing Email *
            </Label>
            <Input
              id="billing_email"
              type="email"
              value={formData.billing_email}
              onChange={e => setFormData({ ...formData, billing_email: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white"
              placeholder="billing@acmetours.com"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-glass-orange hover:bg-glass-orange/80 text-white focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
