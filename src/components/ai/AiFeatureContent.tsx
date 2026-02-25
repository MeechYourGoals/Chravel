import React from 'react';
import { ArrowRight } from 'lucide-react';

interface AiFeatureContentProps {
  description: string;
}

export const AiFeatureContent = ({ description }: AiFeatureContentProps) => {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-white/90 leading-relaxed mb-6">{description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">Click to open full interface</div>
        <div className="flex items-center gap-2 text-yellow-500 group-hover:translate-x-1 transition-transform">
          <span className="font-medium">Open Tool</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  );
};
