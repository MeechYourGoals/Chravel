import React from 'react';
import { Button } from '../../ui/button';
import demoPreviewHero from '@/assets/demo-preview-hero.png';

interface HeroSectionProps {
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  return (
    <div
      className="relative container mx-auto px-4 flex flex-col min-h-[85vh] md:min-h-[90vh] text-center pb-8 md:pb-6"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
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
          className="text-xs px-3 py-1 bg-primary hover:bg-primary/90 backdrop-blur-md border border-white/10 text-primary-foreground shadow-lg h-7"
        >
          Start Coordinating Free
        </Button>
      </div>

      {/* Top Section: Pain-First Headline + Subtitle + Brand */}
      <div className="flex-shrink-0 pt-4 md:pt-8">
        {/* Pain-First Headline */}
        <div className="w-full flex items-center justify-center px-2 md:px-4 mb-2 md:mb-3">
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight animate-fade-in text-center w-full"
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            Group Travel Made Easy
          </h1>
        </div>

        {/* New Subtitle */}
        <p
          className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 font-medium max-w-3xl mx-auto mb-3 md:mb-4 animate-fade-in"
          style={{
            animationDelay: '0.05s',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}
        >
          Friends, Families, Sports, Tours, Work Trips & More.<br className="hidden sm:inline" />
          Planning is Frustrating. <span className="text-[#F4B23A] font-semibold">Get UnFrustrated.</span>
        </p>

        {/* Brand Name */}
        <div
          className="inline-block px-5 py-2 rounded-xl animate-fade-in"
          style={{
            backgroundColor: 'rgba(128, 128, 128, 0.15)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
            style={{
              background: 'linear-gradient(135deg, #4F8CFF 0%, #F4B23A 40%, #F4B23A 60%, #4F8CFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ChravelApp
          </h2>
        </div>
      </div>

      {/* Demo Preview Image - fills the middle space */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 md:py-6">
        <div className="w-full max-w-4xl mx-auto px-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
            <img 
              src={demoPreviewHero}
              alt="ChravelApp trip dashboard preview"
              className="w-full h-auto"
            />
            {/* Subtle overlay to blend edges */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070B1A]/30 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Mobile CTA - centered below preview */}
        <Button
          onClick={onSignUp}
          className="mt-4 px-6 py-3 bg-primary hover:bg-primary/90 backdrop-blur-md border border-border/50 text-primary-foreground rounded-lg text-base font-semibold shadow-xl shadow-black/30 animate-fade-in lg:hidden"
          style={{ animationDelay: '0.2s' }}
        >
          Start Coordinating Free
        </Button>
      </div>

      {/* Bottom Section: Hero copy */}
      <div className="flex-shrink-0 flex flex-col items-center">
        {/* Secondary tagline */}
        <div
          className="inline-block px-5 py-2 rounded-xl animate-fade-in"
          style={{
            animationDelay: '0.1s',
            backgroundColor: 'rgba(128, 128, 128, 0.15)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <h3
            className="text-xl sm:text-2xl md:text-3xl lg:text-3xl font-bold leading-tight"
            style={{
              background: 'linear-gradient(135deg, #4F8CFF 0%, #F4B23A 40%, #F4B23A 60%, #4F8CFF 100%)',
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
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-white font-bold max-w-4xl animate-fade-in mt-3 md:mt-4"
          style={{
            animationDelay: '0.15s',
            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          Plans, Photos, Places, PDFs, & Payments — FINALLY in one shared space.
        </p>
      </div>
    </div>
  );
};
