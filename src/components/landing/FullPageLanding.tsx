import React, { Suspense, lazy } from 'react';
import { FullPageLandingSection } from './FullPageLandingSection';
import { StickyLandingNav } from './StickyLandingNav';
import { MobileAuthHeader } from './MobileAuthHeader';
import { HeroSection } from './sections/HeroSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';

// Lazy load sections for better performance
const HowItWorksSection = lazy(() => import('./sections/HowItWorksSection').then(module => ({ default: module.HowItWorksSection })));
const AiFeaturesSection = lazy(() => import('./sections/AiFeaturesSection').then(module => ({ default: module.AiFeaturesSection })));
const UseCasesSection = lazy(() => import('./sections/UseCasesSection').then(module => ({ default: module.UseCasesSection })));
const SocialStorageSection = lazy(() => import('./sections/SocialStorageSection').then(module => ({ default: module.SocialStorageSection })));
const SocialProofVideoSection = lazy(() => import('./sections/SocialProofVideoSection').then(module => ({ default: module.SocialProofVideoSection })));
const ReplacesSection = lazy(() => import('./sections/ReplacesSection').then(module => ({ default: module.ReplacesSection })));
const FAQSection = lazy(() => import('./sections/FAQSection').then(module => ({ default: module.FAQSection })));
const PricingLandingSection = lazy(() => import('./sections/PricingLandingSection').then(module => ({ default: module.PricingLandingSection })));
const FooterSection = lazy(() => import('./FooterSection').then(module => ({ default: module.FooterSection })));

// Import cinematic hero images
import heroImage from '@/assets/hero-images/group-planning-terrace.png';
import chaosImage from '@/assets/hero-images/cafe-devices-planning.png';
import aiImage from '@/assets/hero-images/adventure-nature-1920.jpg';
import scenariosImage from '@/assets/hero-images/sports-events-1920.jpg';
import happyTravelersImage from '@/assets/hero-images/concert-festival-crowd.png';
import unifiedWorkspaceImage from '@/assets/hero-images/wedding-reception.png';
import replacesImage from '@/assets/hero-images/tech-icons-abstract.png';
import pricingWorkspaceImage from '@/assets/hero-images/golf-course-tropical.png';

interface FullPageLandingProps {
  onSignUp: () => void;
}

// Loading fallback component
const SectionLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
);

export const FullPageLanding: React.FC<FullPageLandingProps> = ({ onSignUp }) => {
  return (
    <>
      {/* Mobile Auth Header - Shows only on mobile */}
      <MobileAuthHeader onSignUp={onSignUp} />
      
      {/* Sticky Navigation */}
      <StickyLandingNav onSignUp={onSignUp} />

      {/* Full-Page Scrolling Container */}
      <div className="snap-y snap-proximity md:snap-mandatory overflow-y-auto h-screen scroll-smooth">
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

        {/* Section 3: How It Works (NEW) */}
        <FullPageLandingSection
          id="section-how"
          imageFallback={heroImage}
          videoOpacity={0.5}
        >
          <Suspense fallback={<SectionLoader />}>
            <HowItWorksSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 4: AI Features */}
        <FullPageLandingSection
          id="section-ai"
          imageFallback={aiImage}
          videoOpacity={0.5}
        >
          <Suspense fallback={<SectionLoader />}>
            <AiFeaturesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 5: Use Cases */}
        <FullPageLandingSection
          id="section-use-cases"
          imageFallback={scenariosImage}
          videoOpacity={0.5}
          minHeight="120vh"
        >
          <Suspense fallback={<SectionLoader />}>
            <UseCasesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 6: Social Storage */}
        <FullPageLandingSection
          id="section-storage"
          imageFallback={unifiedWorkspaceImage}
          videoOpacity={0.5}
          minHeight="110vh"
        >
          <Suspense fallback={<SectionLoader />}>
            <SocialStorageSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 7: Social Proof */}
        <FullPageLandingSection
          id="section-proof"
          imageFallback={happyTravelersImage}
          videoOpacity={0.5}
        >
          <Suspense fallback={<SectionLoader />}>
            <SocialProofVideoSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 8: Replaces */}
        <FullPageLandingSection
          id="section-replaces"
          imageFallback={replacesImage}
          videoOpacity={0.6}
        >
          <Suspense fallback={<SectionLoader />}>
            <ReplacesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 9: FAQ (NEW) */}
        <FullPageLandingSection
          id="section-faq"
          imageFallback={pricingWorkspaceImage}
          videoOpacity={0.5}
        >
          <Suspense fallback={<SectionLoader />}>
            <FAQSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 10: Pricing */}
        <FullPageLandingSection
          id="section-pricing"
          imageFallback={pricingWorkspaceImage}
          videoOpacity={0.5}
          minHeight="110vh"
        >
          <Suspense fallback={<SectionLoader />}>
            <PricingLandingSection onSignUp={onSignUp} />
          </Suspense>
        </FullPageLandingSection>

        {/* Footer (No snap) */}
        <div id="section-footer" className="snap-start">
          <Suspense fallback={<SectionLoader />}>
            <FooterSection />
          </Suspense>
        </div>
      </div>
    </>
  );
};
