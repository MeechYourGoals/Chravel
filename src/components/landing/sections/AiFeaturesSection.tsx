import React from 'react';
import { Sparkles, MapPin, Bell, FileText } from 'lucide-react';
import aiConcierge from '@/assets/app-screenshots/ai-concierge.png';
import placesMaps from '@/assets/app-screenshots/places-maps.png';

export const AiFeaturesSection = () => {
  const aiFeatures = [
    {
      icon: <Sparkles className="text-accent" size={32} />,
      title: 'AI Concierge',
      description: 'Chat with AI for personalized recommendations based on your location, preferences, and trip context. From finding the perfect restaurant to planning activities, your AI assistant knows your trip inside-out.',
      badge: 'Smart'
    },
    {
      icon: <MapPin className="text-primary" size={32} />,
      title: 'Smart Basecamp',
      description: 'Get location-aware recommendations within perfect travel distance from your home base. AI understands where you\'re staying and suggests venues, activities, and restaurants in your ideal radius.',
      badge: 'Location-Aware'
    },
    {
      icon: <Bell className="text-accent" size={32} />,
      title: 'Smart Notifications',
      description: 'Context-aware alerts for schedule conflicts, important chat messages, and group itineraries. Never miss what matters without notification overload.',
      badge: 'Context-Aware'
    },
    {
      icon: <FileText className="text-primary" size={32} />,
      title: 'AI Trip Summaries',
      description: 'Get daily or weekly digests of what\'s happening with your group — upcoming events, pending payments, and recent photos, all in one smart briefing.',
      badge: 'Automated'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 md:py-0 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          AI-Powered Intelligence
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          Your personal travel assistant with verified data and real-world context
        </p>
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
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold text-lg sm:text-xl leading-tight">{feature.title}</h3>
                    <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full whitespace-nowrap">
                      {feature.badge}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Text */}
      <p className="text-xl text-white font-medium max-w-2xl text-center">
        Powered by advanced AI models with access to verified venue data, weather forecasts, and travel intelligence
      </p>
    </div>
  );
};
