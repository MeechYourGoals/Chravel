import React from 'react';
import { Button } from '../../ui/button';

interface HeroSectionProps {
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  return (
    <div
      className="relative container mx-auto px-4 flex flex-col items-center min-h-[85vh] md:min-h-[90vh] text-center pb-12 md:pb-0"
      style={{
        // Safe area for PWA + increased spacing on mobile to prevent overlap
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
      }}
    >
      {/* NO top-right auth button - CTA is centered in hero content below */}

      {/* Brand Name - Category label style (75% of original size) */}
      <div className="w-full flex items-center justify-center px-2 md:px-4 mb-4 md:mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold text-white leading-tight animate-fade-in text-center w-full">
          ChravelApp
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center">
        {/* Tagline - Primary headline (50% of original size) */}
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold leading-tight animate-fade-in"
          style={{
            background:
              'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 20px rgba(74, 144, 226, 0.3), 0 4px 40px rgba(245, 166, 35, 0.2)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          The Group Chat Travel App
        </h2>

        {/* Secondary tagline - Sub-headline (~33% of original size) */}
        <h3
          className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold leading-tight animate-fade-in mt-6 md:mt-8"
          style={{
            animationDelay: '0.1s',
            background:
              'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 20px rgba(74, 144, 226, 0.3), 0 4px 40px rgba(245, 166, 35, 0.2)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          Less Chaos, More Coordinated
        </h3>

        {/* Subheadline - Supporting copy (NO CHANGE as requested) */}
        <p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold max-w-4xl animate-fade-in mt-6 md:mt-8"
          style={{
            animationDelay: '0.15s',
            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          One Shared Space for Chat, Calendar, Photos, Payments, & More
        </p>

        {/* Centered CTA - Dark background with white text, visible on all devices */}
        <Button
          onClick={onSignUp}
          className="mt-8 px-6 py-3 bg-background/90 hover:bg-background backdrop-blur-md border border-border/50 text-white rounded-lg text-base font-semibold shadow-xl shadow-black/30 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          Login/Sign Up
        </Button>
      </div>
    </div>
  );
};
