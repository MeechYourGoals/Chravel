import React from 'react';
import { Button } from '../../ui/button';
import { Users, Calendar, MapPin, Sparkles } from 'lucide-react';
import { DemoModeToggle } from '../../DemoModeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import tripsDashboard from '@/assets/app-screenshots/trips-dashboard.png';

// Mobile header height constant (matches MobileAuthHeader.tsx)
const MOBILE_HEADER_HEIGHT = 52;

interface HeroSectionProps {
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  const isMobile = useIsMobile();

  return (
    <div
      className="relative container mx-auto px-4 flex flex-col items-center min-h-[85vh] md:min-h-[90vh] text-center pb-12 md:pb-0"
      style={{
        // On mobile: account for fixed MobileAuthHeader (safe area + header height + spacing)
        // On desktop: just safe area + small offset
        paddingTop: isMobile
          ? `calc(env(safe-area-inset-top, 0px) + ${MOBILE_HEADER_HEIGHT}px + 16px)`
          : 'calc(env(safe-area-inset-top, 0px) + 16px)'
      }}
    >
      {/* Demo Mode Toggle - Absolutely positioned top-right on desktop, hidden on mobile */}
      <div 
        className="hidden md:block absolute right-4 z-10" 
        style={{ 
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)'
        }}
      >
        <DemoModeToggle />
      </div>

      {/* Brand Name - Centered, aligned with Demo toggle */}
      <div className="w-full flex items-center justify-center px-2 md:px-4 mb-4 md:mb-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-fade-in text-center w-full">
          ChravelApp
        </h1>
      </div>

      {/* Main Content - Starts immediately after brand name, not centered vertically */}
      <div className="flex flex-col items-center space-y-6">
        {/* Tagline - High contrast gradient with text shadow for readability */}
        <h2
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 20px rgba(74, 144, 226, 0.3), 0 4px 40px rgba(245, 166, 35, 0.2)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        >
          Plan Together.<br />Travel Better.
        </h2>

        {/* Subheadline with bold white text and shadow for contrast */}
        <p 
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold max-w-4xl animate-fade-in"
          style={{ 
            animationDelay: '0.1s',
            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)'
          }}
        >
          The Group Chat Travel App for Shared Calendars, Messages, Media, Payments, and more
        </p>

        {/* CTA */}
        <Button
          size="lg"
          onClick={onSignUp}
          className="text-base md:text-xl px-6 md:px-8 py-6 md:py-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          Get Started Free · Log In or Sign Up
        </Button>

        {/* Product Preview */}
        <div className="mt-8 w-full max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <img
            src={tripsDashboard}
            alt="ChravelApp trips dashboard showing organized group travel"
            className="rounded-xl shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
};
