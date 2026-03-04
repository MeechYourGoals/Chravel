/**
 * Final CTA Screen — Gold shimmer + conversion CTAs
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plane, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion as motionPreset } from '../tokens';

interface FinalCTAScreenProps {
  onCreateTrip: () => void;
  onExploreDemoTrip: () => void;
}

export const FinalCTAScreen = ({ onCreateTrip, onExploreDemoTrip }: FinalCTAScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center relative overflow-hidden">
      {/* Subtle gold shimmer background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, hsl(38 61% 48%) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Success icon */}
      <motion.div
        className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 relative z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...motionPreset.slideIn, duration: 0.4 }}
      >
        <motion.div
          initial={{ rotate: -20 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.3, ...motionPreset.slideIn }}
        >
          <Plane className="w-10 h-10 text-primary" />
        </motion.div>
      </motion.div>

      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-foreground mb-2 relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...motionPreset.slideIn }}
      >
        Spin up your first trip in 30 seconds.
      </motion.h1>

      <motion.p
        className="text-muted-foreground text-base sm:text-lg max-w-sm mb-8 relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ...motionPreset.slideIn }}
      >
        One link. Everyone's in.
      </motion.p>

      <motion.div
        className="space-y-3 w-full max-w-xs relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, ...motionPreset.slideIn }}
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
