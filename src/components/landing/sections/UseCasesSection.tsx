import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const scenarios = [
  {
    title: 'Family Hubs, Schedules & Carpools',
    subtitle: 'Practices · pickups · errands · roomies · year-round planning',
    before:
      "Last-minute texts. Missed pickups. Fridge notes ignored. Confusion over who's doing what — and when.",
    expandCTA: 'See how families stay organized',
    after:
      'One shared space for year-round family logistics and recurring routines. Keep calendars, chat updates, tasks, and photos in sync — so everyone knows where to be, and when.',
    badge: 'Fewer drop-offs missed · more time together',
    isHero: true,
  },
  {
    title: 'Touring Artists & Crews',
    subtitle: 'Musicians · comedians · podcasts · managers · production',
    before:
      'Spreadsheets, countless texts, last-minute changes, and missed details. Overwhelmed Tour Managers & Annoyed Artists.',
    expandCTA: 'See how tours stay in sync',
    after:
      'Show days, off days, crew channels, logistics, and payments—all in one place. Everyone aligned, every city.',
    badge: 'Fewer mistakes · smoother tours',
  },
  {
    title: 'Bach Parties → Wedding Weekends',
    subtitle: 'Bachelor & bachelorette trips · guests · families · vendors',
    before:
      'Dozens of chats between families, guests, planners, and vendors. Guests constantly asking where to be and when.',
    expandCTA: 'See how celebrations run smoothly',
    after:
      'One shared itinerary with pinned locations, real-time updates, and live photo sharing—no confusion, just celebration.',
    badge: 'Fewer questions · more memories',
  },
  {
    title: 'Fraternities/Sororities & Similar Organizations',
    subtitle: 'Rush · formals · retreats · philanthropy · chapter ops',
    before:
      'One giant group chat becomes a permanent archive — endless scrollback, mixed events, and sensitive moments living forever in one thread.',
    expandCTA: 'See how chapters stay private',
    after:
      "Create separate Trip vaults per event (Rush Week, Formal, Retreat) so chat + media stay compartmentalized. Membership is explicit, access is controlled, and your private moments don't end up as one searchable liability.",
    badge: 'Private trip vaults with access controls',
  },
  {
    title: 'Youth, Amateur, & Pro sports programs.',
    subtitle: 'Players · coaches · coordinators · operations staff',
    before: 'Staff juggling travel, practices, academics, and logistics across multiple tools.',
    expandCTA: 'See how programs stay aligned',
    after:
      'Role-based access, team schedules, and instant updates—built to scale from college to the pros.',
    badge: 'Fewer errors · faster decisions',
  },
  {
    title: 'Local Community Groups',
    subtitle: 'Run clubs · dog park crews · faith groups · recurring meetups',
    before: 'Plans scattered across DMs, texts, and random calendar invites.',
    expandCTA: 'See how groups stay connected',
    after:
      'One shared home for meetups, locations, notes, and photos—your group finally stays connected.',
    badge: 'Consistency · better turnout',
  },
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
    <div className="relative min-h-screen flex flex-col items-center justify-start pt-8 pb-12 md:pb-16 space-y-4 md:space-y-6">
      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center space-y-12">
        {/* Headline - positioned higher to avoid towel overlap */}
        <div className="text-center space-y-4 max-w-4xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
            Built for Every Journey
          </h2>
          <div
            className="inline-block px-6 py-4 rounded-xl"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.7)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
              For work trips, vacations, sports teams, tours, and even local events. ChravelApp is
              designed to handle it all.
            </p>
          </div>
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
                  'bg-card/50 backdrop-blur-sm border rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-300 cursor-pointer max-w-md mx-auto md:max-w-none',
                  isExpanded ? 'border-primary/50 bg-card/60' : 'hover:border-primary/30',
                  scenario.isHero
                    ? 'border-primary/40 ring-2 ring-primary/20 shadow-lg shadow-primary/10'
                    : 'border-border',
                )}
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="font-bold text-xl md:text-2xl leading-tight break-words">
                    {scenario.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    {scenario.subtitle}
                  </p>
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
    </div>
  );
};
