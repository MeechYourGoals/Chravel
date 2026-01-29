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

// Premium Black & Gold Design System
const DESIGN_TOKENS = {
  pureBlack: '#000000',
  richBlack: '#0a0a0a',
  darkCharcoal: '#121212',
  goldPrimary: '#F4B23A',
  goldLight: '#FFD700',
  goldDark: '#C4912F',
  goldGlow: 'rgba(244,178,58,0.25)',
  goldSoftGlow: 'rgba(244,178,58,0.12)',
  goldAccentGlow: 'rgba(255,215,0,0.15)'
};

const GRADIENTS = {
  hero: {
    colors: [DESIGN_TOKENS.pureBlack, DESIGN_TOKENS.richBlack, DESIGN_TOKENS.darkCharcoal] as [string, string, string],
    direction: 'vertical' as const,
    accentGlow: { color: DESIGN_TOKENS.goldGlow, position: 'top' as const, opacity: 0.30 }
  },
  replaces: {
    colors: [DESIGN_TOKENS.richBlack, DESIGN_TOKENS.pureBlack] as [string, string],
    direction: 'diagonal' as const,
    accentGlow: { color: DESIGN_TOKENS.goldSoftGlow, position: 'center' as const, opacity: 0.20 }
  },
  howItWorks: {
    colors: [DESIGN_TOKENS.pureBlack, DESIGN_TOKENS.darkCharcoal] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: DESIGN_TOKENS.goldGlow, position: 'bottom' as const, opacity: 0.18 }
  },
  useCases: {
    colors: [DESIGN_TOKENS.darkCharcoal, DESIGN_TOKENS.pureBlack] as [string, string],
    direction: 'diagonal' as const,
    accentGlow: { color: DESIGN_TOKENS.goldAccentGlow, position: 'top' as const, opacity: 0.22 }
  },
  aiFeatures: {
    colors: [DESIGN_TOKENS.pureBlack, DESIGN_TOKENS.richBlack] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: DESIGN_TOKENS.goldGlow, position: 'center' as const, opacity: 0.20 }
  },
  pricing: {
    colors: [DESIGN_TOKENS.richBlack, DESIGN_TOKENS.darkCharcoal] as [string, string],
    direction: 'diagonal' as const,
    accentGlow: { color: DESIGN_TOKENS.goldSoftGlow, position: 'top' as const, opacity: 0.25 }
  },
  faq: {
    colors: [DESIGN_TOKENS.pureBlack, DESIGN_TOKENS.richBlack] as [string, string],
    direction: 'vertical' as const,
    accentGlow: { color: DESIGN_TOKENS.goldAccentGlow, position: 'bottom' as const, opacity: 0.15 }
  }
};

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
        className="overflow-y-auto overflow-x-hidden h-screen scroll-smooth"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {/* Section 1: Hero */}
        <FullPageLandingSection
          id="section-hero"
          gradientColors={GRADIENTS.hero.colors}
          gradientDirection={GRADIENTS.hero.direction}
          accentGlow={GRADIENTS.hero.accentGlow}
          minHeight="90vh"
          goldOverlay="hero"
        >
          <HeroSection onSignUp={onSignUp} />
        </FullPageLandingSection>

        {/* Section 2: What It Replaces */}
        <FullPageLandingSection
          id="section-replaces"
          gradientColors={GRADIENTS.replaces.colors}
          gradientDirection={GRADIENTS.replaces.direction}
        >
          <Suspense fallback={<SectionLoader />}>
            <ReplacesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 3: How It Works */}
        <FullPageLandingSection
          id="section-features"
          gradientColors={GRADIENTS.howItWorks.colors}
          gradientDirection={GRADIENTS.howItWorks.direction}
          accentGlow={GRADIENTS.howItWorks.accentGlow}
        >
          <ProblemSolutionSection />
        </FullPageLandingSection>

        {/* Section 4: Use Cases */}
        <FullPageLandingSection
          id="section-use-cases"
          gradientColors={GRADIENTS.useCases.colors}
          gradientDirection={GRADIENTS.useCases.direction}
          accentGlow={GRADIENTS.useCases.accentGlow}
          minHeight="120vh"
        >
          <Suspense fallback={<SectionLoader />}>
            <UseCasesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 5: AI Features */}
        <FullPageLandingSection
          id="section-ai"
          gradientColors={GRADIENTS.aiFeatures.colors}
          gradientDirection={GRADIENTS.aiFeatures.direction}
          accentGlow={GRADIENTS.aiFeatures.accentGlow}
        >
          <Suspense fallback={<SectionLoader />}>
            <AiFeaturesSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 6: Pricing */}
        <FullPageLandingSection
          id="section-pricing"
          gradientColors={GRADIENTS.pricing.colors}
          gradientDirection={GRADIENTS.pricing.direction}
          accentGlow={GRADIENTS.pricing.accentGlow}
          minHeight="110vh"
        >
          <Suspense fallback={<SectionLoader />}>
            <PricingLandingSection onSignUp={onSignUp} />
          </Suspense>
        </FullPageLandingSection>

        {/* Section 7: FAQ */}
        <FullPageLandingSection
          id="section-faq"
          gradientColors={GRADIENTS.faq.colors}
          gradientDirection={GRADIENTS.faq.direction}
          accentGlow={GRADIENTS.faq.accentGlow}
        >
          <Suspense fallback={<SectionLoader />}>
            <FAQSection />
          </Suspense>
        </FullPageLandingSection>

        {/* Footer */}
        <div id="section-footer">
          <Suspense fallback={<SectionLoader />}>
            <FooterSection />
          </Suspense>
        </div>
      </div>
    </>
  );
};
