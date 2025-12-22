import React, { Suspense, lazy, useRef } from 'react';
import { FullPageLandingSection } from './FullPageLandingSection';
import { StickyLandingNav } from './StickyLandingNav';
import { MobileAuthHeader } from './MobileAuthHeader';
import { HeroSection } from './sections/HeroSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';

// Lazy load sections for better performance
const AiFeaturesSection = lazy(() => import('./sections/AiFeaturesSection').then(module => ({ default: module.AiFeaturesSection })));
const UseCasesSection = lazy(() => import('./sections/UseCasesSection').then(module => ({ default: module.UseCasesSection })));
const ReplacesSection = lazy(() => import('./sections/ReplacesSection').then(module => ({ default: module.ReplacesSection })));
const FAQSection = lazy(() => import('./sections/FAQSection').then(module => ({ default: module.FAQSection })));
const PricingLandingSection = lazy(() => import('./sections/PricingLandingSection').then(module => ({ default: module.PricingLandingSection })));
const FooterSection = lazy(() => import('./FooterSection').then(module => ({ default: module.FooterSection })));

// Import cinematic hero images
import heroImage from '@/assets/hero-images/cafe-devices-planning.png';
import chaosImage from '@/assets/hero-images/group-terrace-ui-overlays.png';
import aiImage from '@/assets/hero-images/adventure-nature-1920.jpg';
import scenariosImage from '@/assets/hero-images/sports-events-1920.jpg';
import replacesImage from '@/assets/hero-images/basketball-team-bus.png';
import pricingWorkspaceImage from '@/assets/hero-images/skiers-mountain-resort.png';
import faqImage from '@/assets/hero-images/golf-course-tropical.png';


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
  // Ref for scroll container - used for scroll-to-hide header detection on mobile
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Mobile Auth Header - Shows only on mobile, hides on scroll */}
      <MobileAuthHeader onSignUp={onSignUp} scrollContainerRef={scrollContainerRef} />

      {/* Sticky Navigation */}
      <StickyLandingNav onSignUp={onSignUp} />

      {/* Full-Page Scrolling Container with PWA safe-area support */}
      <div
        ref={scrollContainerRef}
        className="snap-y snap-proximity md:snap-mandatory overflow-y-auto overflow-x-hidden h-screen scroll-smooth"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {/* Section 1: Hero */}
        <FullPageLandingSection
          id="section-hero"
          imageFallback={heroImage}
          videoOpacity={0.5}
          minHeight="90vh"
        >
          <HeroSection onSignUp={onSignUp} />
        </FullPageLandingSection>

        {/* Section 2: How It Works (merged) */}
        <FullPageLandingSection
          id="section-features"
          imageFallback={chaosImage}
          videoOpacity={0.5}
        >
          <ProblemSolutionSection />
        </FullPageLandingSection>

        {/* Section 3: Replaces - Operating System for Groups */}
        <FullPageLandingSection
          id="section-replaces"
          imageFallback={replacesImage}
          videoOpacity={0.6}
        >
          <Suspense fallback={<SectionLoader />}>
            <ReplacesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 4: Use Cases - Built for Every Journey */}
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

        {/* Section 5: AI Features */}
        <FullPageLandingSection
          id="section-ai"
          imageFallback={aiImage}
          videoOpacity={0.5}
        >
          <Suspense fallback={<SectionLoader />}>
            <AiFeaturesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 6: Pricing */}
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

        {/* Section 7: FAQ */}
        <FullPageLandingSection
          id="section-faq"
          imageFallback={faqImage}
          videoOpacity={0.5}
        >
          <Suspense fallback={<SectionLoader />}>
            <FAQSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Footer */}
        <div id="section-footer" className="snap-start">
          <Suspense fallback={<SectionLoader />}>
            <FooterSection />
          </Suspense>
        </div>
      </div>
    </>
  );
};
