import React from 'react';
import { Button } from '../../ui/button';
import { Users, Calendar, MapPin, Sparkles } from 'lucide-react';
import { DemoModeToggle } from '../../DemoModeToggle';

interface HeroSectionProps {
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  return (
    <div className="relative container mx-auto px-4 py-12 md:py-0 flex flex-col items-center justify-center min-h-[90vh] text-center space-y-6">
      {/* Demo Mode Toggle - Top Right */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
        <DemoModeToggle />
      </div>
      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight animate-fade-in">
        Plan Together.<br />Travel Better.
      </h1>

      {/* Subheadline */}
      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground max-w-3xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
        The AI-powered platform for collaborative trip planning, real-time coordination, and unforgettable group experiences.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-3 pt-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <span className="text-base md:text-lg">Group Planning</span>
        </div>
        <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
          <Calendar size={16} className="text-accent" />
          <span className="text-base md:text-lg">Smart Itineraries</span>
        </div>
        <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
          <MapPin size={16} className="text-primary" />
          <span className="text-base md:text-lg">Real-Time Maps</span>
        </div>
        <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="text-base md:text-lg">AI Concierge</span>
        </div>
      </div>

      {/* CTA */}
      <Button 
        size="lg" 
        onClick={onSignUp}
        className="text-xl px-8 py-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 animate-fade-in"
        style={{ animationDelay: '0.3s' }}
      >
        Get Started Free · Log In or Sign Up
      </Button>

      {/* Trust Badge */}
      <p className="text-base md:text-lg text-foreground pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        Join thousands of travelers coordinating trips worldwide
      </p>
    </div>
  );
};
