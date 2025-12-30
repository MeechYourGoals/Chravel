import React from 'react';
import { Wand2, Compass, BellRing, ScrollText, DollarSign, BarChart3 } from 'lucide-react';
import aiConcierge from '@/assets/app-screenshots/ai-concierge.png';
import placesMaps from '@/assets/app-screenshots/places-maps.png';

export const AiFeaturesSection = () => {
  // Group 1 - aligned with AI Concierge screenshot
  const aiFeatures1 = [
    {
      icon: <Wand2 className="text-accent" size={28} />,
      title: 'AI Concierge',
      description: 'AI that understands your trip — not just your question.'
    },
    {
      icon: <DollarSign className="text-primary" size={28} />,
      title: 'Payment Summaries',
      description: 'Payment tracking made easy.'
    },
    {
      icon: <BarChart3 className="text-accent" size={28} />,
      title: 'Polls',
      description: 'Group decisions, locked in — no scrolling, no second-guessing.'
    }
  ];

  // Group 2 - aligned with Places screenshot
  const aiFeatures2 = [
    {
      icon: <Compass className="text-primary" size={28} />,
      title: 'BaseCamps',
      description: 'No more fumbling to find the Airbnb or hotel address. Store it once for all trip members.'
    },
    {
      icon: <BellRing className="text-accent" size={28} />,
      title: 'Smart Notifications',
      description: 'Important updates without the message overload.'
    },
    {
      icon: <ScrollText className="text-primary" size={28} />,
      title: 'AI Trip Summaries',
      description: 'Export clean PDF trip summaries to share off-app.'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-0 flex flex-col items-center justify-start md:justify-center min-h-screen space-y-8 md:space-y-12">
      {/* Headline - bold white text with shadow for contrast */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Travel Intelligence
        </h2>
      </div>

      {/* Split Layout: 2 Rows with Screenshot + 3 Pills each */}
      <div className="max-w-7xl w-full space-y-6 md:space-y-8">
        {/* Row 1: AI Concierge Screenshot + 3 Pills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Left: AI Concierge Screenshot */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300">
            <img 
              src={aiConcierge} 
              alt="AI Concierge providing personalized recommendations" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right: 3 Pills matching screenshot height */}
          <div className="grid grid-rows-3 gap-3 sm:gap-4">
            {aiFeatures1.map((feature, index) => (
              <div
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 hover:border-accent/50 transition-all duration-300 group flex items-center"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-accent/10 p-3 rounded-xl group-hover:bg-accent/20 transition-colors flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-xl mb-1 leading-tight">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Places Screenshot + 3 Pills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Left: Places Screenshot */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-accent/30 transition-all duration-300">
            <img 
              src={placesMaps} 
              alt="Interactive maps and places discovery" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right: 3 Pills matching screenshot height */}
          <div className="grid grid-rows-3 gap-3 sm:gap-4">
            {aiFeatures2.map((feature, index) => (
              <div
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 hover:border-accent/50 transition-all duration-300 group flex items-center"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-accent/10 p-3 rounded-xl group-hover:bg-accent/20 transition-colors flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-xl mb-1 leading-tight">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
