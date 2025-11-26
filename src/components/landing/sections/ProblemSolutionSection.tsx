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
    <div className="container mx-auto px-4 py-12 md:py-0 flex flex-col items-center justify-center min-h-screen text-center space-y-12">
      {/* Headline */}
      <div className="space-y-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Stop Juggling 15 Apps
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground max-w-3xl mx-auto">
          Bring your group, plans, and payments into one place — whether it's a road trip, soccer season, or wedding weekend.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-5xl w-full">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 md:p-6 text-center hover:border-primary/50 transition-all duration-300 hover:scale-105 max-w-md mx-auto md:max-w-none"
          >
            <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-lg sm:text-xl md:text-2xl mb-3 leading-tight sm:leading-snug">{feature.title}</h3>
            <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed break-words">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
