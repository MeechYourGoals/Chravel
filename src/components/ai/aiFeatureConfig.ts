import { Globe } from 'lucide-react';
import { AiFeatureConfig, AiFeatureType } from './types';

export const aiFeatureConfig: Record<AiFeatureType, AiFeatureConfig> = {
  reviews: {
    icon: Globe,
    title: 'AI Review & Audio Summaries',
    description:
      'Get AI-powered text summaries and audio overviews from Yelp, TripAdvisor, OpenTable, Instagram, TikTok, Facebook, and more',
    route: '/ai/review-analysis',
  },
};
