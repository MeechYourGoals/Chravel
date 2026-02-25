import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AiFeatureHeader } from './ai/AiFeatureHeader';
import { AiFeatureContent } from './ai/AiFeatureContent';
import { aiFeatureConfig } from './ai/aiFeatureConfig';
import { AiFeatureType, PlanType } from './ai/types';

interface AiFeatureCardProps {
  feature: AiFeatureType;
  planRequired: PlanType;
}

export const AiFeatureCard = ({ feature }: AiFeatureCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (feature === 'reviews') {
      navigate('/ai/review-analysis');
    } else {
      navigate('/ai/audio-overviews');
    }
  };

  const currentConfig = aiFeatureConfig[feature];
  const Icon = currentConfig.icon;

  return (
    <div
      onClick={handleClick}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-xl hover:bg-white/15 transition-all duration-300 cursor-pointer group"
    >
      <AiFeatureHeader Icon={Icon} title={currentConfig.title} />
      <AiFeatureContent description={currentConfig.description} />
    </div>
  );
};
