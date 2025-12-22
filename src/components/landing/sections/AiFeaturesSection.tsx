import React from 'react';
import { Wand2, Compass, BellRing, ScrollText } from 'lucide-react';
import aiConcierge from '@/assets/app-screenshots/ai-concierge.png';
import placesMaps from '@/assets/app-screenshots/places-maps.png';

export const AiFeaturesSection = () => {
  const aiFeatures = [
    {
      icon: <Wand2 className="text-accent" size={32} />,
      title: 'AI Concierge',
      description: 'AI that understands your trip — not just your question.'
    },
    {
      icon: <Compass className="text-primary" size={32} />,
      title: 'Smart Basecamp',
      description: 'Recommendations based on where you\'re actually staying.'
    },
    {
      icon: <BellRing className="text-accent" size={32} />,
      title: 'Smart Notifications',
      description: 'Alerts only when something matters.'
    },
    {
      icon: <ScrollText className="text-primary" size={32} />,
      title: 'AI Trip Summaries',
      description: 'A shared briefing so no one falls behind.'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 md:py-0 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline - bold white text with shadow for contrast */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Travel Intelligence
        </h2>
      </div>

      {/* Split Layout: Screenshots + Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 max-w-7xl w-full items-center">
        {/* Left: Screenshots */}
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300">
            <img 
              src={aiConcierge} 
              alt="AI Concierge providing personalized recommendations" 
              className="w-full h-auto"
            />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-accent/30 transition-all duration-300">
            <img 
              src={placesMaps} 
              alt="Interactive maps and places discovery" 
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Right: AI Features Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {aiFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-4 sm:p-6 hover:border-accent/50 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="bg-accent/10 p-3 rounded-2xl group-hover:bg-accent/20 transition-colors flex-shrink-0">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xl sm:text-2xl mb-2 leading-tight">{feature.title}</h3>
                  <p className="text-base sm:text-lg text-foreground leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
