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
  Play
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
    description: 'Chat with AI for personalized recommendations based on your location and preferences',
    icon: <Sparkles size={24} />,
    isNew: true
  },
  {
    id: 'basecamp',
    title: 'Smart Basecamp',
    description: 'Get location-aware recommendations within perfect travel distance from your home base',
    icon: <MapPin size={24} />,
    isNew: true
  },
  {
    id: 'chat',
    title: 'Group Chat',
    description: 'Real-time messaging with your travel group, integrated with trip planning',
    icon: <MessageSquare size={24} />
  },
  {
    id: 'calendar',
    title: 'Trip Calendar',
    description: 'Collaborative scheduling and itinerary building with conflict detection',
    icon: <Calendar size={24} />
  },
  {
    id: 'todolist',
    title: 'Shared Task List',
    description: 'Keep everyone accountable with shared tasks, due dates, and completion tracking for seamless trip coordination',
    icon: <CheckSquare size={24} />
  },
  {
    id: 'preferences',
    title: 'Smart Preferences',
    description: 'Set dietary, vibe, budget, and time preferences for tailored group suggestions',
    icon: <Settings size={24} />
  },
  {
    id: 'photos',
    title: 'Photo Albums',
    description: 'Shared photo collections with automatic organization by date and location',
    icon: <Camera size={24} />
  },
  {
    id: 'files',
    title: 'Document Sharing',
    description: 'Centralized file storage for tickets, reservations, and important documents',
    icon: <FileText size={24} />
  }
];

const beforeAfterScenarios = [
  {
    title: "Organizing a multi-family Disney World trip for 18 guests",
    before: "10+ group texts, lost itineraries, last-minute changes, confusion over tickets and park reservations",
    after: "One shared digital trip board, synchronized schedules, automated reminder notifications, group budgeting, and everyone on the same page from airport to park parade",
    savings: "75% less pre-trip stress"
  },
  {
    title: "Managing a 33-person music tour across 30 cities",
    before: "Email chains, Excel sheets, manual check-ins, budget overruns",
    after: "Automated updates, role-based access, expense tracking, seamless logistics",
    savings: "$30K saved per tour"
  }
];

export const FeatureShowcase = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const handleFeatureClick = (featureId: string) => {
    // In a real implementation, this would show a modal or demo
    console.log(`Showing demo for ${featureId}`);
  };

  return (
    <div className="w-full space-y-8">
      {/* Before/After Comparison */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            From chaos to coordination
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground break-words">
            See how Chravel transforms trip planning experiences
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {beforeAfterScenarios.map((scenario, index) => (
            <Card key={index} className="bg-card/80 backdrop-blur-sm border border-border/50">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-xl sm:text-2xl md:text-3xl break-words">{scenario.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                <div className="space-y-2">
                  <div className="text-sm sm:text-base md:text-lg font-medium text-red-400">Before Chravel:</div>
                  <p className="text-xs sm:text-sm md:text-base text-foreground bg-red-500/10 p-2.5 md:p-3 rounded-lg border-l-4 border-red-500 break-words">
                    {scenario.before}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-sm sm:text-base md:text-lg font-medium text-green-400">After Chravel:</div>
                  <p className="text-xs sm:text-sm md:text-base text-foreground bg-green-500/10 p-2.5 md:p-3 rounded-lg border-l-4 border-green-500 break-words">
                    {scenario.after}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                  {scenario.savings}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Powerful features for every type of trip
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground break-words">
            Everything you need for seamless trip coordination
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.id} 
              className="bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
              onClick={() => handleFeatureClick(feature.id)}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    {React.cloneElement(feature.icon as React.ReactElement, { 
                      size: 18
                    })}
                  </div>
                  <div className="flex gap-1">
                    {feature.isNew && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                        New
                      </Badge>
                    )}
                    {feature.isPro && (
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                        Pro
                      </Badge>
                    )}
                  </div>
                </div>
                
                <h3 className="font-semibold text-base sm:text-lg md:text-xl text-foreground mb-2 break-words">{feature.title}</h3>
                <p className="text-xs sm:text-sm md:text-base text-foreground mb-3 md:mb-4 leading-relaxed break-words">
                  {feature.description}
                </p>
                
                {feature.demo && (
                  <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto text-primary hover:text-primary text-xs">
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