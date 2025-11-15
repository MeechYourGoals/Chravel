import React from 'react';
import { PricingSection } from '../../conversion/PricingSection';

interface PricingLandingSectionProps {
  onSignUp: () => void;
}

export const PricingLandingSection: React.FC<PricingLandingSectionProps> = ({ onSignUp }) => {
  return (
    <div className="w-full py-12">
      <PricingSection onSignUp={onSignUp} />
    </div>
  );
};
