import React, { useState } from 'react';
import { X, Mail, Phone, User, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TripCategory, RosterMember } from '../../types/enterprise';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: Omit<RosterMember, 'id' | 'status' | 'invitationSent'>) => void;
  tripCategory: TripCategory;
}

const getRolesByCategory = (category: TripCategory): string[] => {
  const roleMap: Record<TripCategory, string[]> = {
    'Sports – Pro, Collegiate, Youth': [
      'Player',
      'Coach',
      'Assistant Coach',
      'Trainer',
      'Team Manager',
      'Student-Athlete',
      'Athletic Director',
    ],
    'Tour – Music, Comedy, etc.': [
      'Artist',
      'Tour Manager',
      'Sound Engineer',
      'Lighting Tech',
      'Crew',
      'Security',
      'Photographer',
      'Comedian',
      'Performer',
    ],
    'Business Travel': [
      'Executive',
      'Manager',
      'Employee',
      'Consultant',
      'Client',
      'Admin',
      'Participant',
      'Organizer',
    ],
    'School Trip': ['Student', 'Teacher', 'Chaperone', 'Guide', 'Bus Driver', 'Admin'],
    Content: ['Director', 'Producer', 'Actor', 'Crew', 'Camera Operator', 'Sound Engineer'],
    Other: ['Participant', 'Staff', 'Admin', 'Coordinator', 'Assistant'],
  };
  return roleMap[category] || ['Team Member', 'Staff', 'Admin'];
};

export const AddMemberModal = ({
  isOpen,
  onClose,
  onAddMember,
  tripCategory,
}: AddMemberModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    contactMethod: 'email' as 'email' | 'phone' | 'both',
    sendInvite: true,
  });

  const [useEmail, setUseEmail] = useState(true);
  const [usePhone, setUsePhone] = useState(false);

  const roles = getRolesByCategory(tripCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.role) return;

    let contactMethod: 'email' | 'phone' | 'both' = 'email';
    if (useEmail && usePhone) contactMethod = 'both';
    else if (usePhone) contactMethod = 'phone';

    const memberData = {
      name: formData.name.trim(),
      role: formData.role,
      email: useEmail ? formData.email : undefined,
      phone: usePhone ? formData.phone : undefined,
      contactMethod,
      invitedAt: formData.sendInvite ? new Date().toISOString() : undefined,
    };

    onAddMember(memberData);

    // Reset form
    setFormData({
      name: '',
      role: '',
      email: '',
      phone: '',
      contactMethod: 'email',
      sendInvite: true,
    });
    setUseEmail(true);
    setUsePhone(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Add Team Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              required
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label className="text-white">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={value => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Method Toggles */}
          <div className="space-y-4">
            <Label className="text-white">Contact Information</Label>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-gray-400" />
                <span className="text-white">Email</span>
              </div>
              <Switch checked={useEmail} onCheckedChange={setUseEmail} />
            </div>

            {useEmail && (
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Phone size={16} className="text-gray-400" />
                <span className="text-white">Phone</span>
              </div>
              <Switch checked={usePhone} onCheckedChange={setUsePhone} />
            </div>

            {usePhone && (
              <Input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            )}
          </div>

          {/* Send Invite Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check size={16} className="text-gray-400" />
              <span className="text-white">Send invitation immediately</span>
            </div>
            <Switch
              checked={formData.sendInvite}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, sendInvite: checked }))}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/80"
              disabled={!formData.name.trim() || !formData.role || (!useEmail && !usePhone)}
            >
              Add Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
