/**
 * Chat Demo Screen — Chravel-authentic chat with segmented control
 *
 * ~6s loop: Messages mode → 2 messages → switch to Broadcasts → broadcast + label → reaction → reset
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoBubble, DemoSegmentedControl } from '../primitives';
import { motion as motionPreset, LOOP_DURATION } from '../tokens';

const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: motionPreset.slideIn,
};

export const ChatDemoScreen = () => {
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState(0);

  const resetAndLoop = useCallback(() => {
    setStep(0);
    setCycle(c => c + 1);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),   // segmented control + first message
      setTimeout(() => setStep(2), 1500),   // own message
      setTimeout(() => setStep(3), 2000),   // switch to Broadcasts
      setTimeout(() => setStep(4), 2300),   // broadcast message + label
      setTimeout(() => setStep(5), 4000),   // reaction
      setTimeout(resetAndLoop, LOOP_DURATION * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cycle, resetAndLoop]);

  const segmentMode = step >= 3 ? 'broadcasts' : 'messages';

  return (
    <div className="flex flex-col h-full">
      {/* Segmented control */}
      <div className="px-3 py-2">
        <DemoSegmentedControl active={segmentMode} />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col px-3 py-2 justify-end gap-2">
        <AnimatePresence mode="sync">
          {/* Messages mode content */}
          {step >= 1 && step < 3 && (
            <motion.div
              key={`${cycle}-msg1`}
              {...slideUp}
              className="flex flex-col relative"
            >
              <DemoBubble
                variant="other"
                sender="Alex"
                text="Found an amazing sushi spot near the hotel"
                avatar={{ initial: 'A', color: 'bg-blue-500' }}
              />
            </motion.div>
          )}

          {step >= 2 && step < 3 && (
            <motion.div key={`${cycle}-msg2`} {...slideUp} className="flex flex-col">
              <DemoBubble
                variant="own"
                text="We're down! Let's lock it in 🙌"
              />
            </motion.div>
          )}

          {/* Broadcasts mode content */}
          {step >= 4 && (
            <motion.div
              key={`${cycle}-broadcast`}
              {...slideUp}
              className="flex flex-col relative"
            >
              <DemoBubble
                variant="broadcast"
                text="Dinner reservation added to calendar"
                showBroadcastLabel
              />
              {/* Reaction */}
              {step >= 5 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={motionPreset.micro}
                  className="self-start ml-2 mt-1 text-sm"
                >
                  🔥
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

ChatDemoScreen.title = 'One trip. One chat.';
ChatDemoScreen.subtitle = 'Messages, broadcasts, and reactions — all in your trip.';
