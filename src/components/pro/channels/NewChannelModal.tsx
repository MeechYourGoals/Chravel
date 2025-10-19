import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { useChannels } from '../../../hooks/useChannels';
import { ChannelWithStats } from '../../../types/channels';

interface NewChannelModalProps {
  tripId: string;
  onClose: () => void;
  onChannelCreated: (channel: ChannelWithStats) => void;
}

export const NewChannelModal: React.FC<NewChannelModalProps> = ({
  tripId,
  onClose,
  onChannelCreated
}) => {
  const { createChannel, isCreating: loading } = useChannels(tripId);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel_type: 'custom' as 'role' | 'custom',
    role_filter: {
      role: '',
      department: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const channel = await createChannel({
        trip_id: tripId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        channel_type: formData.channel_type,
        role_filter: formData.channel_type === 'role' ? formData.role_filter : undefined
      });

      if (channel) {
        const channelWithStats: ChannelWithStats = {
          ...channel,
          stats: {
            channel_id: channel.id,
            member_count: 0,
            message_count: 0,
            unread_count: 0
          },
          member_count: 0,
          last_message: undefined,
          is_unread: false
        };

        onChannelCreated(channelWithStats);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create Channel</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Channel Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="general-chat"
              className="bg-card/50 border-border"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What's this channel about?"
              className="bg-card/50 border-border"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-white mb-2 block">Channel Type</Label>
            <RadioGroup
              value={formData.channel_type}
              onValueChange={(value) => setFormData({ ...formData, channel_type: value as 'role' | 'custom' })}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-card/50">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer flex-1">
                  <div className="font-medium text-white">Custom Channel</div>
                  <div className="text-sm text-gray-400">Manually invite members</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-card/50">
                <RadioGroupItem value="role" id="role" />
                <Label htmlFor="role" className="cursor-pointer flex-1">
                  <div className="font-medium text-white">Role-Based Channel</div>
                  <div className="text-sm text-gray-400">Auto-add users by role</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
