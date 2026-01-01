import React from 'react';
import { Star, MapPin, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

const metrics = [
  { 
    value: "Instantly See", 
    label: "Schedule Conflicts", 
    icon: <MapPin size={18} />, 
    trend: "Automatically flags double-bookings before they happen" 
  },
  { 
    value: "Automatic", 
    label: "Payment Tracking", 
    icon: <Clock size={18} />, 
    trend: "See who's paid and who hasn't, all in one place" 
  },
  { 
    value: "Real-Time", 
    label: "Updates", 
    icon: <Star size={18} />, 
    trend: "Everyone stays in sync when plans change" 
  },
  { 
    value: "Proven", 
    label: "Complex Group Logistics", 
    icon: <TrendingUp size={18} />, 
    trend: "Successfully handles sports teams, tours, and family reunions" 
  }
];

export const SocialProofVideoSection = () => {
  return (
    <div className="container mx-auto px-4 py-8 md:py-0 flex flex-col items-center justify-start md:justify-center min-h-0 md:min-h-screen space-y-6 md:space-y-8">
      {/* Headline - positioned at top with contrast for concert/festival background */}
      <div className="text-center space-y-3 max-w-4xl pt-8">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold"
          style={{ color: '#0A1E3D', textShadow: '0 2px 4px rgba(255,255,255,0.3)' }}
        >
          Built for Groups Worldwide
        </h2>
        <p
          className="text-lg sm:text-xl md:text-2xl px-4 py-2 rounded-xl inline-block"
          style={{
            color: '#0A1E3D',
            fontWeight: 600,
            backgroundColor: 'rgba(156,163,175,0.85)',
            backdropFilter: 'blur(8px)'
          }}
        >
          ChravelApp removes the Chaos from Coordinating.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl w-full px-2">
        {metrics.map((metric, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 w-full overflow-hidden">
            <CardContent className="p-3 sm:p-4 space-y-1">
              {/* Inline icon + value */}
              <div className="flex items-center justify-center gap-2">
                <div className="text-primary flex-shrink-0">
                  {metric.icon}
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary leading-tight">
                  {metric.value}
                </div>
              </div>
              <div className="text-sm sm:text-base text-primary text-center leading-tight">
                {metric.label}
              </div>
              <div className="text-xs sm:text-sm text-accent text-center leading-snug line-clamp-2">
                {metric.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
