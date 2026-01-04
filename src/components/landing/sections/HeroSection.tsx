import React from 'react';
import { Button } from '../../ui/button';

interface HeroSectionProps {
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  return (
    <div
      className="relative container mx-auto px-4 flex flex-col min-h-[85vh] md:min-h-[90vh] text-center pb-12 md:pb-8"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
      }}
    >
      {/* Top-right Sign up / Log in button - DESKTOP ONLY (≥1024px)
          IMPORTANT: Must use lg: breakpoint (1024px) to match useIsMobile() hook.
          DO NOT change to md: as it causes button overlap on mobile/PWA (768-1023px devices) */}
      <div
        className="absolute right-2 w-auto z-10 hidden lg:block"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        }}
      >
        <Button
          size="sm"
          onClick={onSignUp}
          className="text-xs px-2 py-1 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg h-7"
        >
          Sign up / Log in
        </Button>
      </div>

      {/* Top Section: Brand Name + Main Tagline */}
      <div className="flex-shrink-0">
        {/* Brand Name */}
        <div className="w-full flex items-center justify-center px-2 md:px-4 mb-6 md:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-fade-in text-center w-full">
            ChravelApp
          </h1>
        </div>

        {/* Tagline - Primary headline */}
        <div
          className="inline-block px-6 py-3 rounded-xl animate-fade-in"
          style={{
            backgroundColor: 'rgba(128, 128, 128, 0.15)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold leading-tight"
            style={{
              background:
                'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            The Group Chat Travel App
          </h2>
        </div>
      </div>

      {/* Mobile: CTA centered in viewport - MOBILE/PWA ONLY (<1024px)
          IMPORTANT: Must use lg:hidden to match useIsMobile() hook (1024px breakpoint).
          This ensures proper display on tablets, landscape phones, and PWA viewports */}
      <div className="flex-1 flex items-center justify-center lg:hidden">
        <Button
          onClick={onSignUp}
          className="px-6 py-3 bg-background/90 hover:bg-background backdrop-blur-md border border-border/50 text-white rounded-lg text-base font-semibold shadow-xl shadow-black/30 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          Sign up / Log in
        </Button>
      </div>

      {/* Bottom Section: Hero copy + CTA (desktop) */}
      <div className="flex-shrink-0 mt-auto flex flex-col items-center">
        {/* Secondary tagline */}
        <div
          className="inline-block px-6 py-3 rounded-xl animate-fade-in"
          style={{
            animationDelay: '0.1s',
            backgroundColor: 'rgba(128, 128, 128, 0.15)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <h3
            className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold leading-tight"
            style={{
              background:
                'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Less Chaos, More Coordinated
          </h3>
        </div>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold max-w-4xl animate-fade-in mt-4 md:mt-6"
          style={{
            animationDelay: '0.15s',
            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          One Shared Space for Chat, Calendar, Photos, Payments, & More
        </p>
      </div>
    </div>
  );
};
