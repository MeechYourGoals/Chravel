/**
 * Chat Demo Screen — Animated chat sequence showing messages + broadcast
 *
 * ~6s loop: message → reply → broadcast → reaction → crossfade reset
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoBubble } from '../DemoPrimitives';
import { motion as motionPreset, LOOP_DURATION } from '../demoTokens';

const MESSAGES = [
  {
    id: 'msg1',
    variant: 'other' as const,
    sender: 'Alex',
    avatar: { initial: 'A', color: 'bg-blue-500' },
    text: 'Found an amazing sushi spot near the hotel',
    delay: 0.5,
  },
  {
    id: 'msg2',
    variant: 'own' as const,
    text: 'I\'m in! Book it 🙌',
    delay: 1.5,
  },
  {
    id: 'broadcast',
    variant: 'broadcast' as const,
    text: 'Dinner reservation added to calendar',
    delay: 2.5,
  },
];

const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: motionPreset.slideIn,
};

export const ChatDemoScreen = () => {
  const [cycle, setCycle] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showReaction, setShowReaction] = useState(false);

  const resetAndLoop = useCallback(() => {
    setVisibleCount(0);
    setShowReaction(false);
    setCycle(c => c + 1);
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Show messages one by one
    MESSAGES.forEach((msg, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), msg.delay * 1000));
    });

    // Show reaction at 4s
    timers.push(setTimeout(() => setShowReaction(true), 4000));

    // Reset loop
    timers.push(setTimeout(resetAndLoop, LOOP_DURATION * 1000));

    return () => timers.forEach(clearTimeout);
  }, [cycle, resetAndLoop]);

  return (
    <div className="flex flex-col h-full px-3 py-4 justify-end gap-2">
      <AnimatePresence mode="sync">
        {MESSAGES.slice(0, visibleCount).map((msg) => (
          <motion.div
            key={`${cycle}-${msg.id}`}
            {...slideUp}
            className="flex flex-col relative"
          >
            <DemoBubble
              variant={msg.variant}
              sender={msg.sender}
              text={msg.text}
              avatar={msg.avatar}
            />
            {/* Reaction on first message */}
            {msg.id === 'msg1' && showReaction && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={motionPreset.micro}
                className="absolute -bottom-1 left-10 text-sm"
              >
                🔥
              </motion.span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Screen metadata for desktop two-column layout
ChatDemoScreen.title = 'One trip. One chat.';
ChatDemoScreen.subtitle = 'Messages, broadcasts, and reactions — all in your trip.';
