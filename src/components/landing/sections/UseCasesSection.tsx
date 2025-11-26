import React from 'react';

const scenarios = [
  {
    emoji: "🎢",
    title: "Family Trip",
    subtitle: "18 guests",
    before: "10 different group chats, 4 email threads, and lost PDFs with tickets and reservations.",
    after: "One shared space for flights, calendars, park reservations, and photos — no confusion, just memories.",
    savings: "75% less stress"
  },
  {
    emoji: "🎤",
    title: "Touring Artists",
    subtitle: "12-person crew",
    before: "21 cities over 5 months. Endless text threads, spreadsheets, and miscommunication.",
    after: "All show days, off days, crew chats, payments, and logistics in one app — everyone in sync on every city.",
    savings: "$30K saved"
  },
  {
    emoji: "💒",
    title: "Wedding Weekend",
    subtitle: "Wedding party + families",
    before: "A wedding website no one checks, email chains, and scattered group chats for bachelor and bachelorette events.",
    after: "Guests chat in one space, see the weekend itinerary, pin hotel and Airbnb addresses, and upload photos in real time — no one asks 'where are we supposed to be?' again.",
    savings: "3× more photos captured"
  },
  {
    emoji: "⚽",
    title: "Youth Soccer Season",
    subtitle: "Parents coordinating",
    before: "Parents texting last-minute about snacks, rides, and which field you're on this week.",
    after: "One season calendar, carpool sign-ups, snack assignments, and shared photos — automatically synced for every parent.",
    savings: "10 hrs/month saved"
  },
  {
    emoji: "🏈",
    title: "College Football Program",
    subtitle: "80+ people",
    before: "Staff juggling travel, practices, classes, hotel rooming lists, and group chats across apps.",
    after: "Role-based access, team calendars, academic schedules, and instant updates for staff and players — all organized in one place.",
    savings: "15 hrs/week saved"
  },
  {
    emoji: "🐕",
    title: "Friends & Community Groups",
    subtitle: "Local crews & clubs",
    before: "Your dog-park crew, weekly run club, or intramural team lives across DMs, texts, and random calendar invites.",
    after: "One shared hub for meetups, locations, shared notes, and highlight photos — your local crew finally has a home base.",
    savings: "1 home for recurring meetups"
  }
];

export const UseCasesSection = () => {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Built for Every Journey — Even When You're Not Traveling
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          From family vacations to local leagues and weddings, Chravel is your group's shared home for plans, messages, and memories.
        </p>
      </div>

      {/* Scenarios Grid - 3 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-7xl w-full">
        {scenarios.map((scenario, index) => (
          <div
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 md:p-6 hover:border-primary/50 transition-all duration-300 max-w-md mx-auto md:max-w-none"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl sm:text-4xl flex-shrink-0">{scenario.emoji}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-xl md:text-2xl leading-tight break-words">{scenario.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{scenario.subtitle}</p>
              </div>
            </div>

            {/* Before/After */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="text-xs sm:text-sm font-bold text-red-400 mb-1 uppercase">BEFORE CHRAVEL</div>
                <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed break-words">{scenario.before}</p>
              </div>
              
              <div>
                <div className="text-xs sm:text-sm font-bold text-green-400 mb-1 uppercase">WITH CHRAVEL</div>
                <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed break-words">{scenario.after}</p>
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
