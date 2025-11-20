import React from 'react';
import { Star, MapPin, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

const metrics = [
  { 
    value: "Instantly See", 
    label: "Itinerary Conflicts", 
    icon: <MapPin size={20} />, 
    trend: "Automatically flags double-bookings before they happen" 
  },
  { 
    value: "Automatic", 
    label: "Payment Tracking", 
    icon: <Clock size={20} />, 
    trend: "See who's paid and who hasn't, all in one place" 
  },
  { 
    value: "Real-Time", 
    label: "Updates", 
    icon: <Star size={20} />, 
    trend: "Everyone gets instant alerts when plans change" 
  },
  { 
    value: "Proven", 
    label: "Complex Travel", 
    icon: <TrendingUp size={20} />, 
    trend: "Successfully handles sports teams, tours, and family reunions" 
  }
];

export const SocialProofVideoSection = () => {
  return (
    <div className="container mx-auto px-4 py-12 md:py-0 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Trusted by Travelers Worldwide
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          See why thousands choose Chravel for group coordination
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 md:gap-4 max-w-6xl w-full">
        {metrics.map((metric, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 max-w-md mx-auto sm:max-w-none">
            <CardContent className="p-4 sm:p-5 md:p-6 text-center space-y-2 sm:space-y-3">
              <div className="flex items-center justify-center text-primary">
                {metric.icon}
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight">
                {metric.value}
              </div>
              <div className="text-sm sm:text-base text-foreground leading-tight break-words">
                {metric.label}
              </div>
              <div className="text-xs sm:text-sm text-accent leading-normal break-words line-clamp-2 sm:line-clamp-3">
                {metric.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <p className="text-lg text-muted-foreground max-w-2xl text-center">
        Join families, sports teams, touring artists, and corporate groups who've eliminated travel chaos
      </p>
    </div>
  );
};
