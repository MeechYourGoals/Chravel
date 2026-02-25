import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useTripTasks } from '../../hooks/useTripTasks';
import { Users, User } from 'lucide-react';

interface TaskAssignmentModalProps {
  taskId: string;
  tripId: string;
  onClose: () => void;
}

export const TaskAssignmentModal = ({ taskId, tripId, onClose }: TaskAssignmentModalProps) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'individual' | 'role'>('individual');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { bulkAssign, autoAssignByRole } = useTripTasks(tripId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assignmentMode === 'individual') {
      await bulkAssign({ taskId, userIds: selectedUsers });
    } else {
      await autoAssignByRole(taskId, selectedRole);
    }

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Assign Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignment Mode */}
          <div className="space-y-3">
            <Label className="text-gray-300">Assignment Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignmentMode('individual')}
                className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  assignmentMode === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <User size={16} />
                Individual
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode('role')}
                className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  assignmentMode === 'role'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Users size={16} />
                By Role
              </button>
            </div>
          </div>

          {assignmentMode === 'individual' ? (
            <div className="space-y-2">
              <Label className="text-gray-300">Select Members</Label>
              <div className="text-gray-400 text-sm">Member selection would appear here</div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-gray-300">Select Role</Label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-lg px-3 py-2"
              >
                <option value="">Choose a role...</option>
                <option value="crew">Crew</option>
                <option value="production">Production</option>
                <option value="talent">Talent</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              Assign Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
