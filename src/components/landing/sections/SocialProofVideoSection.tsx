import React from 'react';
import { Star, MapPin, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

const metrics = [
  { 
    value: "Instantly See", 
    label: "Schedule Conflicts", 
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
    trend: "Everyone stays in sync when plans change" 
  },
  { 
    value: "Proven", 
    label: "Complex Group Logistics", 
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
          Built for Groups Worldwide
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          ChravelApp removes the Chaos from Coordinating.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 max-w-6xl w-full px-2">
        {metrics.map((metric, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 w-full overflow-hidden">
            <CardContent className="p-5 sm:p-6 lg:p-8 text-center space-y-3">
              <div className="flex items-center justify-center text-primary">
                {React.cloneElement(metric.icon as React.ReactElement, { size: 28 })}
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight break-words">
                {metric.value}
              </div>
              <div className="text-base lg:text-lg text-foreground leading-tight break-words">
                {metric.label}
              </div>
              <div className="text-sm text-accent leading-normal break-words">
                {metric.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
