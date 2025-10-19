import React from 'react';
import { Star, Users, MapPin, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  useCase: string;
}

interface Metric {
  value: string;
  label: string;
  icon: React.ReactNode;
  trend?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Paul George Elite AAU Team",
    role: "AAU Travel Coach",
    company: "Elite AAU team",
    avatar: "PG",
    quote: "This looks like the app we didn't know we needed. Please, please let us know once this is live. It would be so helpful for our team as well as AAU teams across the country.",
    rating: 5,
    useCase: "Youth Sports"
  },
  {
    name: "Chris Burns", 
    role: "Promoter",
    company: "Live Nation",
    avatar: "CB",
    quote: "Managing double-digit people crews across the country always comes with a bit of chaos, but travel app looks poised to alleviate the headaches of thousands of artists.",
    rating: 5,
    useCase: "Music Tour"
  },
  {
    name: "Carla Santiago",
    role: "Mom, family trip planner",
    company: "Family Vacation",
    avatar: "CS",
    quote: "As a mom, planning and organizing the family trips is draining and often overwhelming. I have needed something like Chravel for years and can't wait for the launch.",
    rating: 5,
    useCase: "Group Travel"
  }
];


const metrics: Metric[] = [
  { value: "Instantly See", label: "Itinerary Conflicts", icon: <MapPin size={16} />, trend: "Automatically flags double-bookings before they happen" },
  { value: "Automated", label: "Payment Tracking", icon: <Clock size={16} />, trend: "See who's paid and who hasn't, all in one place" },
  { value: "Real-Time", label: "Updates", icon: <Star size={16} />, trend: "Everyone gets instant alerts when plans change" },
  { value: "Proven for", label: "Complex Travel", icon: <TrendingUp size={16} />, trend: "Successfully handles sports teams, tours, and family reunions" }
];

export const SocialProofSection = () => {
  return (
    <div className="w-full space-y-8">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2 text-primary">
                {metric.icon}
              </div>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              {metric.trend && (
                <div className="text-xs text-accent mt-1">{metric.trend}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
};