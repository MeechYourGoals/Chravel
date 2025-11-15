import React from 'react';
import { Sparkles, MapPin } from 'lucide-react';

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

      {/* AI Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full">
        {aiFeatures.map((feature, index) => (
          <div
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8 hover:border-accent/50 transition-all duration-300 group"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-accent/10 p-4 rounded-2xl group-hover:bg-accent/20 transition-colors">
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-2xl">{feature.title}</h3>
                  <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full">
                    {feature.badge}
                  </span>
                </div>
                <p className="text-lg text-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Text */}
      <p className="text-lg text-muted-foreground max-w-2xl text-center">
        Powered by advanced AI models with access to verified venue data, weather forecasts, and travel intelligence
      </p>
    </div>
  );
};
