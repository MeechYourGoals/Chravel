import React from 'react';
import { FullPageLandingSection } from './FullPageLandingSection';
import { StickyLandingNav } from './StickyLandingNav';
import { HeroSection } from './sections/HeroSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';
import { AiFeaturesSection } from './sections/AiFeaturesSection';
import { UseCasesSection } from './sections/UseCasesSection';
import { SocialProofVideoSection } from './sections/SocialProofVideoSection';
import { ReplacesSection } from './sections/ReplacesSection';
import { PricingLandingSection } from './sections/PricingLandingSection';

// Import generated images
import heroImage from '@/assets/hero-group-planning.jpg';
import chaosImage from '@/assets/chaos-vs-organization.jpg';
import aiImage from '@/assets/ai-concierge-map.jpg';
import scenariosImage from '@/assets/travel-scenarios.jpg';
import happyTravelersImage from '@/assets/happy-travelers.jpg';
import appInterfaceImage from '@/assets/app-interface-bg.jpg';

interface FullPageLandingProps {
  onSignUp: () => void;
}

export const FullPageLanding: React.FC<FullPageLandingProps> = ({ onSignUp }) => {
  return (
    <>
      {/* Sticky Navigation */}
      <StickyLandingNav onSignUp={onSignUp} />

      {/* Full-Page Scrolling Container */}
      <div className="snap-y snap-mandatory overflow-y-scroll h-screen scroll-smooth">
        {/* Section 1: Hero */}
        <FullPageLandingSection
          id="section-hero"
          imageFallback={heroImage}
          videoOpacity={0.5}
          minHeight="90vh"
        >
          <HeroSection onSignUp={onSignUp} />
        </FullPageLandingSection>

        {/* Section 2: Problem/Solution */}
        <FullPageLandingSection
          id="section-features"
          imageFallback={chaosImage}
          videoOpacity={0.5}
        >
          <ProblemSolutionSection />
        </FullPageLandingSection>

        {/* Section 3: AI Features */}
        <FullPageLandingSection
          id="section-ai"
          imageFallback={aiImage}
          videoOpacity={0.5}
        >
          <AiFeaturesSection />
        </FullPageLandingSection>

        {/* Section 4: Use Cases */}
        <FullPageLandingSection
          id="section-use-cases"
          imageFallback={scenariosImage}
          videoOpacity={0.5}
          minHeight="120vh"
        >
          <UseCasesSection />
        </FullPageLandingSection>

        {/* Section 5: Social Proof */}
        <FullPageLandingSection
          id="section-proof"
          imageFallback={happyTravelersImage}
          videoOpacity={0.5}
        >
          <SocialProofVideoSection />
        </FullPageLandingSection>

        {/* Section 6: Replaces (No video, focus on content) */}
        <FullPageLandingSection
          id="section-replaces"
          className="bg-background"
        >
          <ReplacesSection />
        </FullPageLandingSection>

        {/* Section 7: Pricing */}
        <FullPageLandingSection
          id="section-pricing"
          imageFallback={appInterfaceImage}
          videoOpacity={0.3}
          minHeight="110vh"
        >
          <PricingLandingSection onSignUp={onSignUp} />
        </FullPageLandingSection>
      </div>
    </>
  );
};
