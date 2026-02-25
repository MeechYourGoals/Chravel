import React from 'react';
import { useTripVariant } from '../../contexts/TripVariantContext';

export const AiFeatureBadge = () => {
  const { accentColors } = useTripVariant();

  return (
    <span
      className={`bg-gradient-to-r from-${accentColors.primary}/20 to-${accentColors.secondary}/20 backdrop-blur-sm border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full`}
    >
      Avail to Plus/Pro Subscribers
    </span>
  );
};
