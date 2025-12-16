import React from 'react';
import { Search, Clock, MessageCircle } from 'lucide-react';

export const ProblemSolutionSection = () => {
  const features = [
    {
      icon: <Search className="text-primary" size={28} />,
      title: 'Never Ask "What\'s the Plan?"',
      description: 'Everyone sees the same itinerary, updated instantly. No more digging through old texts or missed calendar invites.'
    },
    {
      icon: <MessageCircle className="text-accent" size={28} />,
      title: 'Never Lose a Memory',
      description: 'All your group\'s photos, links, and moments in one searchable place — from boarding passes to game-day highlights.'
    },
    {
      icon: <Clock className="text-primary" size={28} />,
      title: 'Never Chase a Payment',
      description: 'See who paid, who owes, and split expenses without the awkward follow-up texts. Complete audit trail included.'
    }
  ];

  return (
    <div className="container mx-auto px-4 pt-8 md:pt-12 pb-12 flex flex-col items-center min-h-screen text-center space-y-12">
      {/* Headline - positioned at top with dark background for contrast */}
      <div className="space-y-4">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold"
          style={{ color: '#0A1E3D', textShadow: '0 2px 4px rgba(255,255,255,0.3)' }}
        >
          Stop juggling 10+ Apps every trip
        </h2>
        <p
          className="text-xl sm:text-2xl md:text-3xl max-w-3xl mx-auto px-4 py-3 rounded-xl"
          style={{
            color: '#0A1E3D',
            fontWeight: 700,
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)'
          }}
        >
          Bring your group's photos, plans, and payments into one place
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-5xl w-full px-2">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-3 sm:p-4 hover:border-primary/50 transition-all duration-300 hover:scale-105 w-full overflow-hidden"
          >
            {/* Inline icon + title */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="bg-primary/10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                {React.cloneElement(feature.icon as React.ReactElement, { size: 18, className: 'text-primary' })}
              </div>
              <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-primary leading-tight">{feature.title}</h3>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-foreground text-center leading-relaxed line-clamp-3">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
