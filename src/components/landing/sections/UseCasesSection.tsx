import React from 'react';

const scenarios = [
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
  }
];

export const UseCasesSection = () => {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Built for Every Journey
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          From family vacations to professional tours
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 max-w-6xl w-full">
        {scenarios.map((scenario, index) => (
          <div
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 md:p-6 hover:border-primary/50 transition-all duration-300 max-w-md mx-auto md:max-w-none"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl sm:text-4xl flex-shrink-0">{scenario.emoji}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight break-words">{scenario.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{scenario.subtitle}</p>
              </div>
            </div>

            {/* Before/After */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="text-xs font-semibold text-red-400 mb-1">BEFORE CHRAVEL</div>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words">{scenario.before}</p>
              </div>
              
              <div>
                <div className="text-xs font-semibold text-green-400 mb-1">WITH CHRAVEL</div>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words">{scenario.after}</p>
              </div>

              {/* Savings Badge */}
              <div className="inline-block px-2 sm:px-3 py-1 bg-accent/20 text-accent rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                {scenario.savings}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
