import React from 'react';
import { Users } from 'lucide-react';

interface Participant {
  id: string | number;
  name: string;
  role: string;
}

interface RecipientSelectorProps {
  participants: Participant[];
  recipient: string;
  onRecipientChange: (recipient: string) => void;
  isConsumerTrip: boolean;
}

export const RecipientSelector = ({ 
  participants, 
  recipient, 
  onRecipientChange,
  isConsumerTrip 
}: RecipientSelectorProps) => {
  if (isConsumerTrip) {
    return null;
  }

  const roleOptions = Array.from(new Set(participants.map(p => p.role)));

  return (
    <div className="flex items-center gap-2">
      <Users size={14} className="text-slate-400" />
      <select
        value={recipient}
        onChange={(e) => onRecipientChange(e.target.value)}
        className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
      >
        <option value="everyone">Everyone</option>
        {roleOptions.map((role) => (
          <option key={`role-${role}`} value={`role:${role}`}>
            {role}
          </option>
        ))}
        {participants.map((p) => (
          <option key={`user-${p.id}`} value={`user:${p.id}`}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
};
