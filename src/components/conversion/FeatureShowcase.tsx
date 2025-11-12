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
    description: 'Chat with AI for personalized recommendations based on your location, preferences, and trip context',
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
    emoji: "🎢",
    title: "Family Trip",
    subtitle: "18 guests",
    before: "10 different group chats, 4 email threads, and lost PDFs containing tickets and reservations.",
    after: "One shared space for tickets, calendars, and park reservations — no confusion, just memories.",
    savings: "75% less stress"
  },
  {
    emoji: "🎤",
    title: "Touring Artists",
    subtitle: "12-person crew",
    before: "Managing a 12-person touring crew across 21 cities over 5 months. Endless text threads, spreadsheets, and miscommunication.",
    after: "All tour dates, crew chats, payments, and logistics in one app. Everyone in sync.",
    savings: "$30K saved"
  },
  {
    emoji: "⚽",
    title: "Youth Soccer Season",
    subtitle: "Parents coordinating",
    before: "Parents texting last-minute about who's bringing orange slices, who's driving, and what field we're at.",
    after: "Shared season schedule, task assignments, and group photo uploads in one thread — automatically synced.",
    savings: "10 hrs/month saved"
  },
  {
    emoji: "🏈",
    title: "College Football Program",
    subtitle: "80+ people",
    before: "Coaches juggling 80+ players, staff, trainers, and hotel spreadsheets with constantly shifting plans and unclear responsibilities.",
    after: "Role-based access, team calendars, and instant updates across staff and players — all organized.",
    savings: "15 hrs/week saved"
  },
  {
    emoji: "💼",
    title: "Corporate Business Trip",
    subtitle: "8 colleagues",
    before: "Eight colleagues flying into the same city, staying at different hotels, trying to coordinate conference schedules, dinner reservations, and shared transportation via scattered emails and texts.",
    after: "Shared trip base camp with everyone's hotel locations, conference schedule, group dinner plans, and transportation—all synced in one place.",
    savings: "12 hrs saved"
  }
];

export const FeatureShowcase = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const handleFeatureClick = (featureId: string) => {
    // In a real implementation, this would show a modal or demo
  };

  return (
    <div className="w-full space-y-8">
      {/* Before/After Comparison */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            From chaos to coordination
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground break-words">
            See how Chravel transforms complex group planning into seamless coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
          {beforeAfterScenarios.map((scenario, index) => (
            <Card key={index} className="bg-card/80 backdrop-blur-sm border border-border/50">
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-lg sm:text-xl md:text-2xl break-words flex items-center gap-2">
                  <span className="text-2xl">{scenario.emoji}</span>
                  <div>
                    <div>{scenario.title}</div>
                    <div className="text-sm text-muted-foreground font-normal">{scenario.subtitle}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3 p-3 md:p-4">
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-medium text-red-400">Before Chravel:</div>
                  <p className="text-xs sm:text-sm md:text-base text-foreground bg-red-500/10 p-2 md:p-2.5 rounded-lg border-l-4 border-red-500 break-words">
                    {scenario.before}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-medium text-green-400">After Chravel:</div>
                  <p className="text-xs sm:text-sm md:text-base text-foreground bg-green-500/10 p-2 md:p-2.5 rounded-lg border-l-4 border-green-500 break-words">
                    {scenario.after}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-accent/20 text-accent text-sm">
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
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Powerful features for every type of trip
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground break-words">
            Everything you need for seamless trip coordination
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.id} 
              className="bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
              onClick={() => handleFeatureClick(feature.id)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    {React.cloneElement(feature.icon as React.ReactElement, { 
                      size: 18
                    })}
                  </div>
                  <div className="flex gap-1">
                    {feature.isNew && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-sm">
                        New
                      </Badge>
                    )}
                    {feature.isPro && (
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-sm">
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
                  <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto text-primary hover:text-primary text-sm">
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