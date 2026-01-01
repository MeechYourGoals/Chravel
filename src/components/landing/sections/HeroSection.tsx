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

      {/* Top Section: Brand Name + Main Tagline */}
      <div className="flex-shrink-0">
        {/* Brand Name */}
        <div className="w-full flex items-center justify-center px-2 md:px-4 mb-6 md:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-fade-in text-center w-full">
            ChravelApp
          </h1>
        </div>

        {/* Tagline - Primary headline */}
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold leading-tight animate-fade-in"
          style={{
            background:
              'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          The Group Chat Travel App
        </h2>
      </div>

      {/* Mobile: CTA centered in viewport - visible only on mobile */}
      <div className="flex-1 flex items-center justify-center md:hidden">
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
        <h3
          className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold leading-tight animate-fade-in"
          style={{
            animationDelay: '0.1s',
            background:
              'linear-gradient(135deg, #4A90E2 0%, #E8A838 35%, #F5A623 50%, #E8A838 65%, #4A90E2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Less Chaos, More Coordinated
        </h3>

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
