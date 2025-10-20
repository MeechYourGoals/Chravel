import React from 'react';
import { Button } from './ui/button';
import { Plane, Users, Calendar, MapPin, Sparkles } from 'lucide-react';

interface UnauthenticatedLandingProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const UnauthenticatedLanding = ({ onSignIn, onSignUp }: UnauthenticatedLandingProps) => {
  return (
    <div className="flex flex-col items-center justify-start px-4 pt-2 pb-16 md:pt-4 md:pb-20">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
        {/* Chravel Logo - Stacked on mobile, absolute on desktop */}
        <div className="flex flex-col items-center md:relative">
          <div className="w-20 h-20 mb-3 md:absolute md:left-8 md:top-0 md:w-32 md:h-32 md:mb-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <img 
              src="/chravel-logo.png" 
              alt="Chravel Logo" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          
          {/* Headline - Centered */}
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight text-center md:pt-0">
            Plan Together.<br />Travel Better.
          </h1>
        </div>

        {/* Subheadline */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-center">
          The AI-powered platform for collaborative trip planning, real-time coordination, and unforgettable group experiences.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <span className="text-sm">Group Planning</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            <span className="text-sm">Smart Itineraries</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <span className="text-sm">Real-Time Maps</span>
          </div>
          <div className="bg-background/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm">AI Concierge</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pt-4">
          <Button 
            size="lg" 
            onClick={onSignUp}
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            Get Started Free · Log In or Sign Up
          </Button>
        </div>

        {/* Trust Badge */}
        <p className="text-sm text-muted-foreground pt-6 text-center">
          Join thousands of travelers coordinating trips worldwide
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
          <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="text-primary" size={24} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Collaborate in Real-Time</h3>
          <p className="text-sm text-muted-foreground">
            Plan together with live updates, chat, and shared itineraries
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-accent/50 transition-colors">
          <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-accent" size={24} />
          </div>
          <h3 className="font-semibold text-lg mb-2">AI-Powered Assistance</h3>
          <p className="text-sm text-muted-foreground">
            Get smart recommendations verified by Google Maps
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
          <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="text-primary" size={24} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Everything in One Place</h3>
          <p className="text-sm text-muted-foreground">
            Maps, schedules, expenses, and memories—all organized
          </p>
        </div>
      </div>
    </div>
  );
};
