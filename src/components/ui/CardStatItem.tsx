import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Shared stat-item component for trip/event cards.
 * Layout: icon above → number centered → label below.
 * Uses gold-gradient-icon for consistent premium gold treatment.
 */

/** Semantic icon sizes for card metadata */
export const CARD_ICON_SIZE = {
  /** Icons in the hero section (location, calendar next to text) */
  heroMobile: 14,
  heroDesktop: 18,
  /** Icons in the stats row (People, Days, Places) */
  stat: 14,
  /** Icons in metadata rows (Organizer, etc.) */
  meta: 16,
} as const;

interface CardStatItemProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  /** Size variant — controls text scaling */
  size?: 'sm' | 'md';
}

export const CardStatItem: React.FC<CardStatItemProps> = ({
  icon: Icon,
  value,
  label,
  size = 'md',
}) => {
  const numberClass = size === 'sm'
    ? 'text-sm font-bold text-white'
    : 'text-xl md:text-2xl font-bold text-white';
  const labelClass = size === 'sm'
    ? 'text-xs text-white/60'
    : 'text-xs md:text-sm text-white/60';

  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-0.5">
        <Icon size={CARD_ICON_SIZE.stat} className="gold-gradient-icon" />
      </div>
      <div className={numberClass}>{value}</div>
      <div className={labelClass}>{label}</div>
    </div>
  );
};
