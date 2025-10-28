import React from 'react';
import { Edit, Lock } from 'lucide-react';

export interface BaseCampPillProps {
  label: string;
  icon?: 'edit' | 'lock';
  tone: 'trip' | 'personal';
  onClick?: () => void;
}

export const BaseCampPill: React.FC<BaseCampPillProps> = ({
  label,
  icon,
  tone,
  onClick
}) => {
  const toneStyles = {
    trip: 'ring-1 ring-sky-400/30 bg-sky-900/30 text-sky-200',
    personal: 'ring-1 ring-emerald-400/30 bg-emerald-900/30 text-emerald-200'
  };

  const iconComponent = icon === 'edit' ? (
    <Edit size={14} className="ml-1" />
  ) : icon === 'lock' ? (
    <Lock size={14} className="ml-1" />
  ) : null;

  return (
    <div
      className={`
        absolute right-4 top-4 rounded-full px-3 py-1.5 text-sm font-medium 
        shadow-md backdrop-blur flex items-center gap-1 
        ${toneStyles[tone]}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <span>{label}</span>
      {iconComponent}
    </div>
  );
};
