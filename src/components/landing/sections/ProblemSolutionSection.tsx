import React from 'react';
import { Search, Clock, MessageCircle } from 'lucide-react';

export const ProblemSolutionSection = () => {
  const features = [
    {
      icon: <Search className="text-primary" size={28} />,
      title: 'Never Ask "What\'s the Plan?"',
      description: 'One live itinerary everyone sees.'
    },
    {
      icon: <MessageCircle className="text-accent" size={28} />,
      title: 'Never Lose a Memory',
      description: 'Every photo, link, and file — auto-saved.'
    },
    {
      icon: <Clock className="text-primary" size={28} />,
      title: 'Never Chase a Payment',
      description: 'Know who paid. Instantly.'
    }
  ];

  return (
    <div className="container mx-auto px-4 pt-8 md:pt-12 pb-12 flex flex-col items-center min-h-screen text-center space-y-12">
      {/* Headline - positioned at top with darker background for contrast */}
      <div className="space-y-4">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
        >
          Stop juggling 10+ Apps every trip
        </h2>
        <p 
          className="text-xl sm:text-2xl md:text-3xl max-w-3xl mx-auto text-white font-bold"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)' }}
        >
          Everything your group needs. One place.
        </p>
      </div>

      {/* Features Grid - stacked vertically on mobile, 3 columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl w-full px-2">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-4 md:p-5 hover:border-primary/50 transition-all duration-300 hover:scale-105 w-full"
          >
            {/* Icon and title - stacked on mobile for better readability */}
            <div className="flex flex-col items-center gap-2 mb-3">
              <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                {React.cloneElement(feature.icon as React.ReactElement, { size: 22, className: 'text-white' })}
              </div>
              <h3
                className="font-extrabold text-lg md:text-xl text-white leading-tight text-center"
                style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.5)' }}
              >{feature.title}</h3>
            </div>
            <p className="text-base md:text-lg text-white/95 text-center font-medium leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
