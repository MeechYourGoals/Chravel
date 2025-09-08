import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { User, Save, X, ChevronDown } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory, getCategoryConfig } from '../../types/proCategories';
import { getRoleOptions } from '../../utils/roleUtils';

interface EditMemberRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ProParticipant | null;
  category: ProTripCategory;
  existingRoles: string[];
  onUpdateRole: (memberId: string, newRole: string) => Promise<void>;
}

export const EditMemberRoleModal = ({
  isOpen,
  onClose,
  member,
  category,
  existingRoles,
  onUpdateRole
}: EditMemberRoleModalProps) => {
  const [newRole, setNewRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categoryConfig = getCategoryConfig(category);
  const roleOptions = getRoleOptions(category, existingRoles);

  useEffect(() => {
    if (member && isOpen) {
      setNewRole(member.role);
      setIsCustomRole(!categoryConfig.roles.includes(member.role));
      setError('');
    }
  }, [member, isOpen, categoryConfig.roles]);

  const handleSave = async () => {
    if (!member || !newRole.trim()) {
      setError('Role is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onUpdateRole(member.id, newRole.trim());
      onClose();
    } catch (err) {
      setError('Failed to update role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNewRole(member?.role || '');
    setIsCustomRole(false);
    setError('');
    onClose();
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} />
            Edit Team Member Role
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Info */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img
                src={member.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
                alt={member.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-medium">{member.name}</h3>
                <p className="text-sm text-gray-400">{member.email}</p>
                <Badge className="mt-1 bg-red-600/20 text-red-400">
                  Current: {member.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label htmlFor="role-type" className="text-sm font-medium">
              Role Type
            </Label>
            
            {/* Toggle between predefined and custom roles */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!isCustomRole ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsCustomRole(false);
                  setNewRole(categoryConfig.roles[0] || '');
                }}
                disabled={categoryConfig.roles.length === 0}
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
                  setNewRole('');
                }}
                className="flex-1"
              >
                Custom
              </Button>
            </div>

            {/* Role Input */}
            {!isCustomRole && categoryConfig.roles.length > 0 ? (
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {categoryConfig.roles.map((role) => (
                    <SelectItem key={role} value={role} className="text-white hover:bg-gray-700">
                      {role}
                    </SelectItem>
                  ))}
                  {/* Show existing custom roles as options */}
                  {existingRoles
                    .filter(role => !categoryConfig.roles.includes(role))
                    .map((role) => (
                      <SelectItem key={role} value={role} className="text-white hover:bg-gray-700">
                        {role} <span className="text-xs text-gray-400">(Custom)</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Enter custom role (e.g., Production Manager, Lead Vocalist)"
                  className="bg-gray-800 border-gray-600 text-white"
                />
                {/* Show suggestions from existing roles */}
                {existingRoles.length > 0 && (
                  <div className="text-xs text-gray-400">
                    <p className="mb-1">Existing roles:</p>
                    <div className="flex flex-wrap gap-1">
                      {existingRoles.slice(0, 5).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setNewRole(role)}
                          className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors"
                        >
                          {role}
                        </button>
                      ))}
                      {existingRoles.length > 5 && (
                        <span className="text-gray-500">+{existingRoles.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              <X size={16} className="mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !newRole.trim() || newRole === member.role}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={16} className="mr-1" />
                  Save Role
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};