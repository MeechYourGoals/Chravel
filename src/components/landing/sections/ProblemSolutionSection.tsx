import React from 'react';
import { CalendarPlus, Share2, RefreshCw } from 'lucide-react';
import tripShareGolf from '@/assets/app-screenshots/trip-share-golf.png';
import tripInviteCoachella from '@/assets/app-screenshots/trip-invite-coachella.png';

export const ProblemSolutionSection = () => {
  const steps = [
    {
      number: 1,
      icon: <CalendarPlus size={32} className="text-primary" />,
      title: "Create a trip",
      description: "Name it. Add Details. Done."
    },
    {
      number: 2,
      icon: <Share2 size={32} className="text-accent" />,
      title: "Invite your group",
      description: "One Link. Easily Shared"
    },
    {
      number: 3,
      icon: <RefreshCw size={32} className="text-primary" />,
      title: "Everything syncs",
      description: "Plans, Places, Photos, Payments — Live"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-start md:justify-center min-h-screen space-y-4 md:space-y-10">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.5)' }}
        >
          How It Works
        </h2>
        <p 
          className="text-lg sm:text-xl md:text-2xl font-semibold text-white/90"
          style={{ textShadow: '2px 2px 6px rgba(0, 0, 0, 0.6)' }}
        >
          From zero → organized in under 60 seconds
        </p>
      </div>

      {/* Steps - Horizontal on desktop, vertical on mobile */}
      <div className="w-full max-w-6xl">
        {/* Desktop View (Hidden on mobile/tablet) */}
        <div className="hidden lg:flex items-center justify-between gap-4 relative">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Card */}
              <div className="flex-1 min-w-0 overflow-hidden bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-all duration-300 relative z-10">
                {/* Number Badge */}
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                
                {/* Content */}
                <h3 className="font-bold text-xl md:text-2xl mb-2 text-foreground break-words">
                  {step.title}
                </h3>
                <p className="text-lg text-accent font-medium break-words">
                  {step.description}
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

        {/* Mobile/Tablet View (Hidden on desktop) */}
        <div className="lg:hidden space-y-4">
          {steps.map((step) => (
            <div key={step.number} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 w-full overflow-hidden">
              {/* Inline Step Number + Icon */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {step.number}
                </div>
                {step.icon}
              </div>

              {/* Content - white bold text for readability */}
              <div className="text-center">
                <h3 className="font-bold text-xl mb-2 text-white break-words" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
                  {step.title}
                </h3>
                <p className="text-lg text-white font-semibold break-words" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screenshots Row - Two cards centered and staggered */}
      <div className="w-full max-w-4xl">
        {/* Desktop: Side by side with equal height */}
        <div className="hidden md:flex justify-center items-start gap-8">
          <div className="flex flex-col items-center">
            <span 
              className="text-white font-semibold text-lg mb-3"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Trip Share
            </span>
            <div className="w-[340px] h-[520px] flex items-center">
              <img 
                src={tripShareGolf}
                alt="Golf Outing trip share card showing group sharing interface"
                className="w-full h-auto max-h-full object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
              />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span 
              className="text-white font-semibold text-lg mb-3"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Trip Invite
            </span>
            <div className="w-[340px] h-[520px] flex items-center">
              <img 
                src={tripInviteCoachella}
                alt="Coachella trip invite card showing invitation interface"
                className="w-full h-auto max-h-full object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Stacked */}
        <div className="md:hidden flex flex-col items-center gap-6">
          <div className="flex flex-col items-center">
            <span 
              className="text-white font-semibold text-base mb-2"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Trip Share
            </span>
            <div className="max-w-[300px]">
              <img 
                src={tripShareGolf}
                alt="Golf Outing trip share card showing group sharing interface"
                className="w-full h-auto rounded-xl shadow-xl border border-border/50"
              />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span 
              className="text-white font-semibold text-base mb-2"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Trip Invite
            </span>
            <div className="max-w-[300px]">
              <img 
                src={tripInviteCoachella}
                alt="Coachella trip invite card showing invitation interface"
                className="w-full h-auto rounded-xl shadow-xl border border-border/50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
