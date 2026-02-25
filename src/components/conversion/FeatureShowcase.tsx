import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  MessageSquare,
  MapPin,
  Calendar,
  CheckSquare,
  Sparkles,
  Settings,
  Camera,
  FileText,
  ChevronRight,
  Play,
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isNew?: boolean;
  isPro?: boolean;
  demo?: string;
}

const features: Feature[] = [
  {
    id: 'concierge',
    title: 'AI Concierge',
    description: 'AI that understands your trip — not just your question.',
    icon: <Sparkles size={24} />,
    isNew: true,
  },
  {
    id: 'basecamp',
    title: 'Smart Basecamp',
    description: "Recommendations based on where you're staying.",
    icon: <MapPin size={24} />,
    isNew: true,
  },
  {
    id: 'chat',
    title: 'Group Chat',
    description: 'Real-time messaging integrated with trip planning.',
    icon: <MessageSquare size={24} />,
  },
  {
    id: 'calendar',
    title: 'Trip Calendar',
    description: 'Collaborative scheduling with conflict detection.',
    icon: <Calendar size={24} />,
  },
  {
    id: 'todolist',
    title: 'Shared Task List',
    description: "Everyone knows what they're responsible for.",
    icon: <CheckSquare size={24} />,
  },
  {
    id: 'preferences',
    title: 'Smart Preferences',
    description: 'Tailored suggestions based on group preferences.',
    icon: <Settings size={24} />,
  },
  {
    id: 'photos',
    title: 'Photo Albums',
    description: 'Shared photos auto-organized by date and location.',
    icon: <Camera size={24} />,
  },
  {
    id: 'files',
    title: 'Document Sharing',
    description: 'All tickets and reservations in one place.',
    icon: <FileText size={24} />,
  },
];

export const FeatureShowcase = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const handleFeatureClick = (featureId: string) => {
    // In a real implementation, this would show a modal or demo
  };

  return (
    <div className="w-full space-y-8">
      {/* Feature Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Powerful features for every type of trip
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground break-words">
            Everything you need for seamless trip coordination
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map(feature => (
            <Card
              key={feature.id}
              className="bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
              onClick={() => handleFeatureClick(feature.id)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    {React.cloneElement(feature.icon as React.ReactElement, {
                      size: 18,
                    })}
                  </div>
                  <div className="flex gap-1">
                    {feature.isNew && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-sm">
                        New
                      </Badge>
                    )}
                    {feature.isPro && (
                      <Badge
                        variant="outline"
                        className="border-yellow-500/30 text-yellow-400 text-sm"
                      >
                        Pro
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-base sm:text-lg md:text-xl text-foreground mb-2 break-words">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-foreground leading-relaxed break-words">
                  {feature.description}
                </p>

                {feature.demo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-0 h-auto text-primary hover:text-primary text-sm mt-3"
                  >
                    <span className="flex items-center gap-1.5">
                      <Play size={12} />
                      See demo
                    </span>
                    <ChevronRight size={12} />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
