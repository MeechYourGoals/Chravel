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
      {/* Top-right Sign up / Log in button - hidden on mobile, visible on md+ */}
      <div
        className="absolute right-2 w-auto z-10 hidden md:block"
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

      {/* Brand Name - Centered, no padding shifts */}
      <div className="w-full flex items-center justify-center px-2 md:px-4 mb-6 md:mb-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-fade-in text-center w-full">
          ChravelApp
        </h1>
      </div>

      {/* Main Content - Starts immediately after brand name, not centered vertically */}
      <div className="flex flex-col items-center">
        {/* Tagline - High contrast gradient with text shadow for readability */}
        <h2
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in"
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

        {/* Secondary tagline with same gradient */}
        <h3
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight animate-fade-in mt-12 md:mt-16"
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

        {/* Subheadline with bold white text and shadow for contrast */}
        <p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold max-w-4xl animate-fade-in mt-6 md:mt-8"
          style={{
            animationDelay: '0.15s',
            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          One Shared Space for Chat, Calendar, Photos, Payments, & More
        </p>

        {/* Mobile CTA - centered below text, visible only on mobile */}
        <Button
          onClick={onSignUp}
          className="md:hidden mt-8 px-6 py-3 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 text-white rounded-lg text-base font-semibold shadow-lg animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          Sign up / Log in
        </Button>
      </div>
    </div>
  );
};
