import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTripVariant } from '../../contexts/TripVariantContext';

interface AiFeatureIconProps {
  Icon: LucideIcon;
}

export const AiFeatureIcon = ({ Icon }: AiFeatureIconProps) => {
  const { accentColors } = useTripVariant();

  return (
    <div
      className={`w-10 h-10 bg-gradient-to-r from-${accentColors.primary}/30 to-${accentColors.secondary}/30 backdrop-blur-sm rounded-xl flex items-center justify-center`}
    >
      <Icon size={24} className={`text-${accentColors.primary}`} />
    </div>
  );
};
