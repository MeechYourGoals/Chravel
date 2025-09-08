import React, { useState } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { tripService } from '../services/tripService';
import { toast } from 'sonner';

interface EditableDescriptionProps {
  tripId: string;
  description: string;
  onUpdate: (newDescription: string) => void;
  className?: string;
}

export const EditableDescription = ({ 
  tripId, 
  description, 
  onUpdate, 
  className = "text-gray-300 text-lg leading-relaxed" 
}: EditableDescriptionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(description);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editValue.trim() === description) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const success = await tripService.updateTrip(tripId, { description: editValue.trim() });
      if (success) {
        onUpdate(editValue.trim());
        setIsEditing(false);
        toast.success('Description updated successfully');
      } else {
        toast.error('Failed to update description');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('Failed to update description');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 text-lg leading-relaxed resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          placeholder="Add a description for this trip..."
          autoFocus
          disabled={isSaving}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm rounded-lg transition-colors"
          >
            <Check size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 text-white text-sm rounded-lg transition-colors"
          >
            <X size={14} />
            Cancel
          </button>
          <span className="text-xs text-gray-400">
            Ctrl+Enter to save, Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="flex items-start gap-3">
        <p className={className}>
          {description || 'No description added yet. Click to add one.'}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 text-gray-400 hover:text-white"
          title="Edit description"
        >
          <Edit size={14} />
        </button>
      </div>
    </div>
  );
};