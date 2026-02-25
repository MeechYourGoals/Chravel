/**
 * Final CTA Screen - Completion with confetti
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Plane, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinalCTAScreenProps {
  onCreateTrip: () => void;
  onExploreDemoTrip: () => void;
}

export const FinalCTAScreen = ({ onCreateTrip, onExploreDemoTrip }: FinalCTAScreenProps) => {
  useEffect(() => {
    // Trigger confetti on mount
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#3A60D0', '#F57C00', '#62D621'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#3A60D0', '#F57C00', '#62D621'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Success icon */}
      <motion.div
        className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.div
          initial={{ rotate: -20 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <Plane className="w-10 h-10 text-primary" />
        </motion.div>
      </motion.div>

      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        You're all set!
      </motion.h1>

      <motion.p
        className="text-muted-foreground text-base sm:text-lg max-w-sm mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Create your first trip and invite your crew
      </motion.p>

      <motion.div
        className="space-y-3 w-full max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button size="lg" className="w-full" onClick={onCreateTrip}>
          <Plane className="w-4 h-4 mr-2" />
          Create Your First Trip
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-full text-muted-foreground"
          onClick={onExploreDemoTrip}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Explore demo trip
        </Button>
      </motion.div>
    </div>
  );
};
