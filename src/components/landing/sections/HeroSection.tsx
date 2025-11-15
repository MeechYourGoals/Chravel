
import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { Button } from '@/components/ui/button';
import { Plane, Users, Calendar, MapPin, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onSignUp: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp }) => {
  return (
    <FullPageLandingSection
      id="hero"
      videoSrc="https://storage.googleapis.com/veo-video-examples/group-trip-planning.mp4"
      imageFallback="https://images.unsplash.com/photo-1527632911563-ee5b6d5344b6?q=80&w=2070&auto=format&fit=crop"
      videoOpacity={0.6}
    >
      <div className="text-center">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
          Plan Together. Travel Better.
        </h1>
        <p className="mt-4 text-xl md:text-2xl max-w-3xl mx-auto">
          The AI-powered platform for collaborative trip planning, real-time coordination, and unforgettable group experiences.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <span className="text-sm sm:text-base">Group Planning</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <Calendar size={14} className="text-accent" />
            <span className="text-sm sm:text-base">Smart Itineraries</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span className="text-sm sm:text-base">Real-Time Maps</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-sm sm:text-base">AI Concierge</span>
          </div>
        </div>
        <div className="mt-8">
          <Button
            size="lg"
            onClick={onSignUp}
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            Get Started Free · Log In or Sign Up
          </Button>
        </div>
        <p className="text-sm text-foreground/80 mt-4">
          Join thousands of travelers coordinating trips worldwide
        </p>
      </div>
    </FullPageLandingSection>
  );
};

export default HeroSection;
