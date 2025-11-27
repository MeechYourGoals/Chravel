import React from 'react';
import { CalendarPlus, Share2, RefreshCw } from 'lucide-react';
import tripDetail from '@/assets/app-screenshots/trip-detail.png';

export const HowItWorksSection = () => {
  const steps = [
    {
      number: 1,
      icon: <CalendarPlus size={32} className="text-primary" />,
      title: "Create a trip or event",
      description: "Set up your group in 30 seconds",
      detail: "Name it, add dates, invite your crew"
    },
    {
      number: 2,
      icon: <Share2 size={32} className="text-accent" />,
      title: "Invite your group",
      description: "One link, everyone's in",
      detail: "Share via text, email, or social"
    },
    {
      number: 3,
      icon: <RefreshCw size={32} className="text-primary" />,
      title: "Everything syncs",
      description: "Automatically for everyone",
      detail: "Chat, calendar, payments, photos — all in one place"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          How It Works
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          Get your group organized in minutes — no complexity, no chaos
        </p>
      </div>

      {/* Steps - Horizontal on desktop, vertical on mobile */}
      <div className="w-full max-w-6xl">
        {/* Desktop View (Hidden on mobile) */}
        <div className="hidden md:flex items-center justify-between gap-4 relative">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Card */}
              <div className="flex-1 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-all duration-300 relative z-10">
                {/* Number Badge */}
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                
                {/* Content */}
                <h3 className="font-bold text-xl md:text-2xl mb-2 text-foreground">
                  {step.title}
                </h3>
                <p className="text-lg text-accent font-medium mb-2">
                  {step.description}
                </p>
                <p className="text-base text-foreground">
                  {step.detail}
                </p>
              </div>

              {/* Connecting Arrow (not after last step) */}
              {index < steps.length - 1 && (
                <div className="flex-shrink-0 w-12 h-1 bg-gradient-to-r from-primary to-accent relative" 
                     style={{ marginLeft: '-1rem', marginRight: '-1rem', zIndex: 0 }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-accent" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile View (Hidden on desktop) */}
        <div className="md:hidden space-y-8">
          {steps.map((step) => (
            <div key={step.number} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center">
              {/* Number Badge */}
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {step.number}
              </div>
              
              {/* Icon */}
              <div className="flex justify-center mb-4">
                {step.icon}
              </div>
              
              {/* Content */}
              <h3 className="font-bold text-xl mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-lg text-accent font-medium mb-2">
                {step.description}
              </p>
              <p className="text-base text-foreground">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Here's What You Get */}
      <div className="w-full max-w-5xl space-y-6">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-foreground">
          Here's What You Get
        </h3>
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300">
          <img 
            src={tripDetail} 
            alt="Complete trip organization with chat, calendar, and payments" 
            className="w-full h-auto"
          />
        </div>
        <p className="text-center text-foreground text-lg sm:text-xl">
          Your trip, organized in seconds
        </p>
      </div>

      {/* Bottom tagline */}
      <p className="text-lg sm:text-xl text-foreground text-center max-w-2xl">
        That's it. No training required, no spreadsheets to manage.
      </p>
    </div>
  );
};
