import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const scenarios = [
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "Family Trip",
    subtitle: "18 guests",
    before: "10 group chats. Email threads. Lost PDFs with reservations.",
    expandCTA: "See how families stay sane with Chravel",
    after: "One shared space for flights, calendars, park reservations, and photos — no confusion, just memories.",
    badge: "75% less stress",
    isHero: true
  },
  {
    emoji: "🎤",
    title: "Touring Artists",
    subtitle: "12-person crew",
    before: "21 cities over 5 months. Endless texts, spreadsheets, confusion.",
    expandCTA: "See how tours stay in sync",
    after: "Show days, off days, crew channels, payments, and logistics — everyone aligned in every city.",
    badge: "$30K saved on average"
  },
  {
    emoji: "💍",
    title: "Wedding Weekend",
    subtitle: "Wedding party + families",
    before: "Wedding website ignored. Scattered chats for bach events.",
    expandCTA: "See how weekends run smoothly",
    after: "One shared itinerary, pinned locations, live photo uploads — no more \"where are we supposed to be?\"",
    badge: "3× more photos captured"
  },
  {
    emoji: "⚽",
    title: "Youth Soccer Season",
    subtitle: "Parents coordinating",
    before: "Last-minute texts about snacks, rides, and which field.",
    expandCTA: "See how seasons stay organized",
    after: "One season calendar, carpool sign-ups, snack assignments, and shared photos — automatically synced.",
    badge: "10 hrs/month saved"
  },
  {
    emoji: "🏈",
    title: "College Football Program",
    subtitle: "80+ people",
    before: "Staff juggling travel, practices, hotels across apps.",
    expandCTA: "See how programs stay aligned",
    after: "Role-based access, team calendars, academic schedules, and instant updates — all in one place.",
    badge: "15 hrs/week saved"
  },
  {
    emoji: "🐕",
    title: "Friends & Community Groups",
    subtitle: "Local crews & clubs",
    before: "Plans scattered across DMs and random calendar invites.",
    expandCTA: "See how groups stay connected",
    after: "One shared hub for meetups, locations, notes, and photos — your group finally has a home.",
    badge: "1 home for recurring plans"
  }
];

export const UseCasesSection = () => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCard = (index: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Built for Every Journey
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          From family vacations to sports travel & tours to business trips. ChravelApp handles it all
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-7xl w-full">
        {scenarios.map((scenario, index) => {
          const isExpanded = expandedCards.has(index);
          
          return (
            <div
              key={index}
              onClick={() => toggleCard(index)}
              className={cn(
                "bg-card/50 backdrop-blur-sm border rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-300 cursor-pointer max-w-md mx-auto md:max-w-none",
                isExpanded ? "border-primary/50 bg-card/60" : "hover:border-primary/30",
                scenario.isHero ? "border-primary/40 ring-2 ring-primary/20 shadow-lg shadow-primary/10" : "border-border"
              )}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl sm:text-4xl flex-shrink-0">{scenario.emoji}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-xl md:text-2xl leading-tight break-words">{scenario.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{scenario.subtitle}</p>
                </div>
              </div>

              {/* Before Section - Always Visible */}
              <div className="mb-3">
                <div className="text-xs sm:text-sm font-bold text-red-400 mb-1 uppercase tracking-wide">
                  Before: Chaos
                </div>
                <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed break-words">
                  {scenario.before}
                </p>
              </div>

              {/* Expand CTA - Only when collapsed */}
              <AnimatePresence mode="wait">
                {!isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1 text-primary text-sm sm:text-base font-medium mt-3"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>{scenario.expandCTA}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-3">
                      {/* After Section */}
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-green-400 mb-1 uppercase tracking-wide">
                          After: Coordinated
                        </div>
                        <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed break-words">
                          {scenario.after}
                        </p>
                      </div>

                      {/* Outcome Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-xs sm:text-sm font-semibold">
                        <span className="text-primary">🟠</span>
                        {scenario.badge}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
