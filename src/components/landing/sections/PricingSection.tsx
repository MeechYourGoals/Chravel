import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { PricingSection as ExistingPricingSection } from '../../conversion/PricingSection';

interface PricingSectionProps {
  onSignUp: () => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({ onSignUp }) => {
  return (
    <FullPageLandingSection id="pricing">
      <div className="w-full max-w-6xl mx-auto">
        <ExistingPricingSection onSignUp={onSignUp} />
      </div>
    </FullPageLandingSection>
  );
};

export default PricingSection;
