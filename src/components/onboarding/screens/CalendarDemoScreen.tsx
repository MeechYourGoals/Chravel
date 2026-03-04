/**
 * Calendar Demo Screen — Animated calendar events + AI Concierge cameo
 *
 * ~6s loop: 2 events → shared badge → AI cameo with "Save to Trip" → reset
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoCard, DemoAvatar, DemoChip, DemoToast } from '../DemoPrimitives';
import { motion as motionPreset, LOOP_DURATION, colors, type as typo, radius, spacing } from '../demoTokens';
import { Users, Sparkles } from 'lucide-react';

const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: motionPreset.slideIn,
};

export const CalendarDemoScreen = () => {
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState(0); // 0-5 phases

  const resetAndLoop = useCallback(() => {
    setStep(0);
    setCycle(c => c + 1);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),   // event 1
      setTimeout(() => setStep(2), 1500),   // event 2
      setTimeout(() => setStep(3), 2500),   // shared badge
      setTimeout(() => setStep(4), 3500),   // AI cameo
      setTimeout(() => setStep(5), 4800),   // saved toast
      setTimeout(resetAndLoop, LOOP_DURATION * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cycle, resetAndLoop]);

  return (
    <div className="flex flex-col h-full px-3 py-4 gap-2.5 relative">
      {/* Event 1 */}
      <AnimatePresence>
        {step >= 1 && (
          <motion.div key={`${cycle}-ev1`} {...slideUp}>
            <DemoCard>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🍽️</span>
                <div className="flex-1 min-w-0">
                  <p className={typo.cardTitle}>Dinner Reservation</p>
                  <p className={typo.cardBody}>7:30 PM · Sushi Saito</p>
                </div>
              </div>
            </DemoCard>
          </motion.div>
        )}

        {/* Event 2 */}
        {step >= 2 && (
          <motion.div key={`${cycle}-ev2`} {...slideUp}>
            <DemoCard>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className={typo.cardTitle}>Museum Visit</p>
                  <p className={typo.cardBody}>10:00 AM · National Art Museum</p>
                </div>
              </div>
            </DemoCard>
          </motion.div>
        )}

        {/* Shared indicator */}
        {step >= 3 && (
          <motion.div
            key={`${cycle}-shared`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={motionPreset.slideIn}
            className="flex items-center gap-1.5 px-1"
          >
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Shared with 4 travelers</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Concierge Cameo */}
      <AnimatePresence>
        {step >= 4 && (
          <motion.div
            key={`${cycle}-ai-cameo`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={motionPreset.slideIn}
            className="absolute bottom-4 right-3 left-3"
          >
            <div className={`${radius.card} border border-emerald-500/20 bg-card p-2.5 space-y-2`}>
              {/* User query */}
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  "Best sushi near Shinjuku?"
                </span>
              </div>

              {/* AI response */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Sushi Saito</p>
                  <p className="text-[10px] text-muted-foreground">⭐ 4.8 · Omakase · $$$$</p>
                </div>
              </div>

              {/* Save to Trip action */}
              <div className="flex justify-end">
                <motion.div
                  animate={
                    step >= 5
                      ? { scale: [1, 1.05, 1] }
                      : {}
                  }
                  transition={{ duration: 0.2 }}
                >
                  <DemoChip
                    label={step >= 5 ? '✓ Saved' : 'Save to Trip'}
                    variant={step >= 5 ? 'saved' : 'action'}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved toast */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <DemoToast text="Saved to trip" show={step >= 5} />
      </div>
    </div>
  );
};

CalendarDemoScreen.title = 'Plans that don\'t drift.';
CalendarDemoScreen.subtitle = 'Shared calendar with AI-powered suggestions.';
