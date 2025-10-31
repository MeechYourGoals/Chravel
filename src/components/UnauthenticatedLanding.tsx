import React from 'react';
import { Button } from './ui/button';
import { Plane, Users, Calendar, MapPin, Sparkles } from 'lucide-react';

interface UnauthenticatedLandingProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const UnauthenticatedLanding = ({ onSignIn, onSignUp }: UnauthenticatedLandingProps) => {
  return (
    <div className="flex flex-col items-center justify-start px-4 pt-12 pb-12 md:pt-2 md:pb-16">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto space-y-3 animate-fade-in">
        {/* Headline - Centered */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight text-center">
          Plan Together.<br />Travel Better.
        </h1>

        {/* Subheadline */}
        <p className="text-sm sm:text-base md:text-lg text-foreground max-w-2xl mx-auto text-center break-words">
          The AI-powered platform for collaborative trip planning, real-time coordination, and unforgettable group experiences.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <span className="text-xs sm:text-sm md:text-base">Group Planning</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <Calendar size={14} className="text-accent" />
            <span className="text-xs sm:text-sm md:text-base">Smart Itineraries</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span className="text-xs sm:text-sm md:text-base">Real-Time Maps</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs sm:text-sm md:text-base">AI Concierge</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pt-2">
          <Button 
            size="lg" 
            onClick={onSignUp}
            className="text-sm sm:text-base md:text-lg px-6 py-4 md:px-8 md:py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            Get Started Free · Log In or Sign Up
          </Button>
        </div>

        {/* Trust Badge */}
        <p className="text-xs sm:text-sm md:text-base text-foreground pt-3 text-center">
          Join thousands of travelers coordinating trips worldwide
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 md:p-6 text-center hover:border-primary/50 transition-colors">
          <div className="bg-primary/10 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
            <Users className="text-primary" size={20} />
          </div>
          <h3 className="font-semibold text-lg sm:text-xl md:text-2xl mb-2 break-words">Collaborate in Real-Time</h3>
          <p className="text-xs sm:text-sm md:text-base text-foreground break-words">
            Plan together with live updates, chat, and shared itineraries
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 md:p-6 text-center hover:border-accent/50 transition-colors">
          <div className="bg-accent/10 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
            <Sparkles className="text-accent" size={20} />
          </div>
          <h3 className="font-semibold text-lg sm:text-xl md:text-2xl mb-2 break-words">AI-Powered Assistance</h3>
          <p className="text-xs sm:text-sm md:text-base text-foreground break-words">
            AI-powered assistance with verified data and real-world context — from venues and hotels to weather and routes.
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 md:p-6 text-center hover:border-primary/50 transition-colors">
          <div className="bg-primary/10 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
            <MapPin className="text-primary" size={20} />
          </div>
          <h3 className="font-semibold text-lg sm:text-xl md:text-2xl mb-2 break-words">Everything in One Place</h3>
          <p className="text-xs sm:text-sm md:text-base text-foreground break-words">
            Maps, schedules, expenses, and memories—all organized
          </p>
        </div>
      </div>
    </div>
  );
};
