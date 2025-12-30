import React from 'react';
import { Button } from '../../ui/button';

// Mobile/tablet header height constant (matches MobileAuthHeader.tsx)
const HEADER_HEIGHT = 52;

interface HeroSectionProps {
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  return (
    <div
      className="relative container mx-auto px-4 flex flex-col items-center min-h-[85vh] md:min-h-[90vh] text-center pb-12 md:pb-0"
      style={{
        // Account for fixed header on mobile/tablet (safe area + header height + spacing)
        // On desktop (lg+): just safe area + small offset since StickyLandingNav only shows after scroll
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${HEADER_HEIGHT}px + 16px)`
      }}
    >
      {/* Top-right Sign up / Log in button - only visible on desktop (lg+) where MobileAuthHeader is hidden */}
      <div
        className="hidden lg:flex flex-col items-end gap-2 absolute right-4 z-10"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)'
        }}
      >
        <Button
          size="default"
          onClick={onSignUp}
          className="text-sm px-4 py-2 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg"
        >
          Sign up / Log in
        </Button>
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
          The Group Chat Travel App
        </h2>

        {/* Subheadline with bold white text and shadow for contrast */}
        <p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold max-w-4xl animate-fade-in"
          style={{
            animationDelay: '0.1s',
            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)'
          }}
        >
          One Shared Space for Chat, Calendar, Photos, Payments, & More
        </p>

        {/* Mobile CTA removed - MobileAuthHeader provides the single prominent "Log in / Sign up" CTA on mobile */}
      </div>
    </div>
  );
};
