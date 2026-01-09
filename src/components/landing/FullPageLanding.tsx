import React, { Suspense, lazy, useRef } from 'react';
import { FullPageLandingSection } from './FullPageLandingSection';
import { StickyLandingNav } from './StickyLandingNav';
import { HeroSection } from './sections/HeroSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';

// Lazy load sections for better performance
const AiFeaturesSection = lazy(() => import('./sections/AiFeaturesSection').then(module => ({ default: module.AiFeaturesSection })));
const UseCasesSection = lazy(() => import('./sections/UseCasesSection').then(module => ({ default: module.UseCasesSection })));
const ReplacesSection = lazy(() => import('./sections/ReplacesSection').then(module => ({ default: module.ReplacesSection })));
const FAQSection = lazy(() => import('./sections/FAQSection').then(module => ({ default: module.FAQSection })));
const PricingLandingSection = lazy(() => import('./sections/PricingLandingSection').then(module => ({ default: module.PricingLandingSection })));
const FooterSection = lazy(() => import('./FooterSection').then(module => ({ default: module.FooterSection })));

// Import landing page background images - simpler, less busy images
import heroImage from '@/assets/landing-grass-field.png';
import scenariosImage from '@/assets/landing-watercolor-cities.png';
import replacesImage from '@/assets/landing-world-map.png';
import howItWorksImage from '@/assets/landing-travel-network.png';
import pricingWorkspaceImage from '@/assets/hero-images/skiers-mountain-resort.png';


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
      {/* Sticky Navigation - desktop only */}
      <StickyLandingNav onSignUp={onSignUp} />

      {/* Full-Page Scrolling Container with PWA safe-area support */}
      <div
        ref={scrollContainerRef}
        className="md:snap-y md:snap-mandatory overflow-y-auto overflow-x-hidden h-screen scroll-smooth"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {/* Section 1: Hero - Keep image (shows product) */}
        <FullPageLandingSection
          id="section-hero"
          imageFallback={heroImage}
          videoOpacity={0.4}
          minHeight="90vh"
        >
          <HeroSection onSignUp={onSignUp} />
        </FullPageLandingSection>

        {/* Section 2: Problem It Solves - Keep image (basketball team bus) */}
        <FullPageLandingSection
          id="section-replaces"
          imageFallback={replacesImage}
          videoOpacity={0.6}
        >
          <Suspense fallback={<SectionLoader />}>
            <ReplacesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 3: How It Works - Travel network background */}
        <FullPageLandingSection
          id="section-features"
          imageFallback={howItWorksImage}
          videoOpacity={0.5}
        >
          <ProblemSolutionSection />
        </FullPageLandingSection>

        {/* Section 4: Use Cases - Keep image (stadium) */}
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

        {/* Section 5: AI Features - Use gradient (cleaner for feature cards) */}
        <FullPageLandingSection
          id="section-ai"
          backgroundStyle="gradient"
          gradientColors={['#0f172a', '#1e293b']}
        >
          <Suspense fallback={<SectionLoader />}>
            <AiFeaturesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 6: Pricing - Keep image (skiers) */}
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

        {/* Section 7: FAQ - Use gradient (cleaner for text-heavy section) */}
        <FullPageLandingSection
          id="section-faq"
          backgroundStyle="gradient"
          gradientColors={['#1e293b', '#0f172a']}
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
