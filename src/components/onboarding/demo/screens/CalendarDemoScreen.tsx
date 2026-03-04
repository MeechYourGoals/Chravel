/**
 * Calendar Demo Screen — Itinerary timeline with AI Concierge cameo
 *
 * ~6s loop: Day header → 2 events → shared badge → AI concierge card → Save → toast → reset
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoDayHeader, DemoTimelineEvent, DemoConciergeCard, DemoToast } from '../primitives';
import { motion as motionPreset, LOOP_DURATION } from '../tokens';
import { Users } from 'lucide-react';

const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: motionPreset.slideIn,
};

export const CalendarDemoScreen = () => {
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState(0);

  const resetAndLoop = useCallback(() => {
    setStep(0);
    setCycle(c => c + 1);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),   // day header
      setTimeout(() => setStep(2), 1000),   // event 1
      setTimeout(() => setStep(3), 1800),   // event 2
      setTimeout(() => setStep(4), 2500),   // shared badge
      setTimeout(() => setStep(5), 3500),   // AI concierge card
      setTimeout(() => setStep(6), 4800),   // saved toast
      setTimeout(resetAndLoop, LOOP_DURATION * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cycle, resetAndLoop]);

  return (
    <div className="flex flex-col h-full px-3 py-3 gap-2 relative">
      <AnimatePresence>
        {/* Day header */}
        {step >= 1 && (
          <motion.div key={`${cycle}-day`} {...slideUp}>
            <DemoDayHeader day={1} date="Friday, June 3" />
          </motion.div>
        )}

        {/* Event 1 */}
        {step >= 2 && (
          <motion.div key={`${cycle}-ev1`} {...slideUp}>
            <DemoTimelineEvent
              emoji="🍽️"
              title="Dinner Reservation"
              category="dining"
              categoryLabel="Dining"
              time="7:30 PM"
              location="Sushi Saito"
            />
          </motion.div>
        )}

        {/* Event 2 */}
        {step >= 3 && (
          <motion.div key={`${cycle}-ev2`} {...slideUp}>
            <DemoTimelineEvent
              emoji="🎯"
              title="Museum Visit"
              category="activity"
              categoryLabel="Activity"
              time="10:00 AM"
              location="National Art Museum"
            />
          </motion.div>
        )}

        {/* Shared indicator */}
        {step >= 4 && (
          <motion.div
            key={`${cycle}-shared`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={motionPreset.slideIn}
            className="flex items-center gap-1.5 px-1 ml-5"
          >
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Shared with 4 Chravelers</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Concierge cameo */}
      <AnimatePresence>
        {step >= 5 && (
          <motion.div
            key={`${cycle}-concierge`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={motionPreset.slideIn}
            className="absolute bottom-3 right-3 left-3"
          >
            <DemoConciergeCard
              query="Best sushi near Shinjuku?"
              title="Sushi Saito"
              rating="⭐ 4.8 · Omakase"
              bullets={[
                'Intimate 8-seat counter experience',
                'Reservations required 2 weeks ahead',
              ]}
              linkText="View on Google Maps"
              saveLabel={step >= 6 ? '✓ Saved to Explore' : 'Save to Trip'}
              onSaveState={step >= 6 ? 'saved' : 'idle'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved toast */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <DemoToast text="Saved to Explore" show={step >= 6} />
      </div>
    </div>
  );
};

CalendarDemoScreen.title = "Plans that don't drift.";
CalendarDemoScreen.subtitle = 'Shared itinerary with AI-powered suggestions.';
