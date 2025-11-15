
import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Star, TrendingUp } from 'lucide-react';

const metrics = [
  { value: "Instantly See", label: "Itinerary Conflicts", icon: <MapPin size={24} />, trend: "Automatically flags double-bookings" },
  { value: "Automatic", label: "Payment Tracking", icon: <Clock size={24} />, trend: "See who's paid and who hasn't" },
  { value: "Real-Time", label: "Updates", icon: <Star size={24} />, trend: "Instant alerts when plans change" },
  { value: "Proven", label: "Complex Travel", icon: <TrendingUp size={24} />, trend: "Handles sports teams, tours, and reunions" }
];

const SocialProofVideoSection: React.FC = () => {
  return (
    <FullPageLandingSection
      id="social-proof"
      videoSrc="https://storage.googleapis.com/veo-video-examples/happy-travelers.mp4"
      imageFallback="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=2070&auto=format&fit=crop"
      videoOpacity={0.7}
    >
      <div className="text-center max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold">Trusted by Thousands of Travelers</h2>
        <p className="mt-4 text-lg md:text-xl">
          From weekend getaways to worldwide tours, Chravel is the trusted platform for seamless group travel.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border border-border/50">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4 text-primary">
                  {metric.icon}
                </div>
                <div className="text-2xl font-bold text-foreground leading-tight">{metric.value}</div>
                <div className="text-base text-foreground mt-1">{metric.label}</div>
                <div className="text-sm text-accent mt-2">{metric.trend}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FullPageLandingSection>
  );
};

export default SocialProofVideoSection;
