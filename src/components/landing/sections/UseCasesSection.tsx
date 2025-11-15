
import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const UseCasesSection: React.FC = () => {
  return (
    <FullPageLandingSection
      id="use-cases"
      videoSrc="https://storage.googleapis.com/veo-video-examples/multiple-travel-scenarios.mp4"
      imageFallback="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop"
      videoOpacity={0.8}
      className="py-16"
    >
      <div className="text-center max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold">Built for Every Journey</h2>
        <p className="mt-4 text-lg md:text-xl">From family vacations to professional tours, Chravel handles the complexity.</p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {beforeAfterScenarios.map((scenario, index) => (
            <Card key={index} className="bg-card/80 backdrop-blur-sm border border-border/50 text-left">
              <CardHeader className="p-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="text-2xl">{scenario.emoji}</span>
                  <div>
                    <div>{scenario.title}</div>
                    <div className="text-sm text-muted-foreground font-normal">{scenario.subtitle}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div>
                  <div className="text-sm font-medium text-red-400">Before:</div>
                  <p className="text-sm text-foreground bg-red-500/10 p-2 rounded-lg border-l-2 border-red-500">
                    {scenario.before}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-green-400">After:</div>
                  <p className="text-sm text-foreground bg-green-500/10 p-2 rounded-lg border-l-2 border-green-500">
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
    </FullPageLandingSection>
  );
};

export default UseCasesSection;
