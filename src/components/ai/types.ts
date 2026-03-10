export interface AiFeatureConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  route: string;
}

export type AiFeatureType = 'reviews';
export type PlanType = 'plus' | 'premium';
