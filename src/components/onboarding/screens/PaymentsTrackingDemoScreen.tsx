/**
 * Payments Tracking Demo Screen — Animated expense splitting + status
 *
 * ~6s loop: expense → split → status chips → settle toggle → reset
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoCard, DemoAvatar, DemoChip } from '../DemoPrimitives';
import { motion as motionPreset, LOOP_DURATION, type as typo } from '../demoTokens';
import { Check } from 'lucide-react';

const travelers = [
  { initial: 'A', color: 'bg-blue-500', name: 'Alex' },
  { initial: 'J', color: 'bg-purple-500', name: 'Jordan' },
  { initial: 'T', color: 'bg-orange-500', name: 'Taylor' },
  { initial: 'C', color: 'bg-emerald-500', name: 'Chris' },
];

const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: motionPreset.slideIn,
};

export const PaymentsTrackingDemoScreen = () => {
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState(0);

  const resetAndLoop = useCallback(() => {
    setStep(0);
    setCycle(c => c + 1);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),   // expense card
      setTimeout(() => setStep(2), 1500),   // split avatars
      setTimeout(() => setStep(3), 2500),   // status chips
      setTimeout(() => setStep(4), 3500),   // one settles
      setTimeout(() => setStep(5), 4500),   // second expense
      setTimeout(resetAndLoop, LOOP_DURATION * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cycle, resetAndLoop]);

  return (
    <div className="flex flex-col h-full px-3 py-4 gap-3">
      <AnimatePresence>
        {/* Expense card */}
        {step >= 1 && (
          <motion.div key={`${cycle}-expense`} {...slideUp}>
            <DemoCard>
              <div className="flex items-center gap-2.5 mb-2.5">
                <DemoAvatar initial="A" color="bg-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className={typo.cardTitle}>Dinner</p>
                  <p className={typo.cardBody}>Paid by Alex</p>
                </div>
                <span className="text-lg font-bold text-foreground">$240</span>
              </div>

              {/* Split detail */}
              {step >= 2 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={motionPreset.slideIn}
                  className="border-t border-border/50 pt-2 mt-1"
                >
                  <p className="text-[10px] text-muted-foreground mb-2">Split 4 ways · $60 each</p>
                  <div className="flex items-center gap-3">
                    {travelers.map((t, i) => (
                      <motion.div
                        key={t.initial}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...motionPreset.micro, delay: i * 0.08 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <DemoAvatar initial={t.initial} color={t.color} size="sm" />
                        <span className="text-[9px] text-muted-foreground">{t.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Status chips */}
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={motionPreset.slideIn}
                  className="flex items-center gap-2 mt-2.5"
                >
                  <DemoChip
                    label={step >= 4 ? '✓ 2 Settled' : '2 Pending'}
                    variant={step >= 4 ? 'settled' : 'pending'}
                  />
                  <DemoChip label="1 Paid" variant="settled" />
                </motion.div>
              )}
            </DemoCard>
          </motion.div>
        )}

        {/* Second expense (brief) */}
        {step >= 5 && (
          <motion.div key={`${cycle}-expense2`} {...slideUp}>
            <DemoCard>
              <div className="flex items-center gap-2.5">
                <DemoAvatar initial="T" color="bg-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className={typo.cardTitle}>Museum Tickets</p>
                  <p className={typo.cardBody}>Split 4 ways</p>
                </div>
                <span className="text-base font-bold text-foreground">$80</span>
              </div>
            </DemoCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

PaymentsTrackingDemoScreen.title = 'Money, organized.';
PaymentsTrackingDemoScreen.subtitle = 'Track expenses, split bills, settle up.';
