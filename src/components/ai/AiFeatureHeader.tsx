import React from 'react';
import { AiFeatureIcon } from './AiFeatureIcon';
import { AiFeatureBadge } from './AiFeatureBadge';
import { LucideIcon } from 'lucide-react';

interface AiFeatureHeaderProps {
  Icon: LucideIcon;
  title: string;
}

export const AiFeatureHeader = ({ Icon, title }: AiFeatureHeaderProps) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <AiFeatureIcon Icon={Icon} />
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <AiFeatureBadge />
    </div>
  );
};
