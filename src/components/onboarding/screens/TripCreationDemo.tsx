/**
 * Trip Creation Demo Screen - Interactive trip creation UI mockup
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, MousePointer2 } from 'lucide-react';

export const TripCreationDemo = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Mock trip creation form */}
      <motion.div
        className="w-full max-w-sm bg-card border border-border rounded-xl p-4 mb-6 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-3 text-left">
          Create New Trip
        </h3>

        {/* Trip name field */}
        <motion.div
          className="bg-background border border-border rounded-lg px-3 py-2 mb-3 text-left"
          initial={{ borderColor: 'hsl(var(--border))' }}
          animate={{ borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))'] }}
          transition={{ duration: 2, delay: 0.5, times: [0, 0.3, 1] }}
        >
          <span className="text-xs text-muted-foreground">Trip Name</span>
          <motion.p
            className="text-foreground font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Weekend in Big Sur
          </motion.p>
        </motion.div>

        {/* Location field */}
        <motion.div
          className="bg-background border border-border rounded-lg px-3 py-2 mb-3 text-left flex items-center gap-2"
          initial={{ borderColor: 'hsl(var(--border))' }}
          animate={{ borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))'] }}
          transition={{ duration: 2, delay: 1.5, times: [0, 0.3, 1] }}
        >
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <div>
            <span className="text-xs text-muted-foreground">Location</span>
            <motion.p
              className="text-foreground font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.5 }}
            >
              Big Sur, California
            </motion.p>
          </div>
        </motion.div>

        {/* Date & Members row */}
        <div className="flex gap-3">
          <motion.div
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-left flex items-center gap-2"
            initial={{ borderColor: 'hsl(var(--border))' }}
            animate={{ borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))'] }}
            transition={{ duration: 2, delay: 2.5, times: [0, 0.3, 1] }}
          >
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <motion.span
              className="text-sm text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8, duration: 0.5 }}
            >
              Mar 15-17
            </motion.span>
          </motion.div>

          <motion.div
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-left flex items-center gap-2"
            initial={{ borderColor: 'hsl(var(--border))' }}
            animate={{ borderColor: ['hsl(var(--border))', 'hsl(var(--primary))', 'hsl(var(--border))'] }}
            transition={{ duration: 2, delay: 3.5, times: [0, 0.3, 1] }}
          >
            <Users className="w-4 h-4 text-muted-foreground" />
            <motion.span
              className="text-sm text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.8, duration: 0.5 }}
            >
              4 friends
            </motion.span>
          </motion.div>
        </div>

        {/* Animated cursor */}
        <motion.div
          className="absolute pointer-events-none"
          initial={{ opacity: 0, x: 50, y: 80 }}
          animate={{
            opacity: [0, 1, 1, 1, 1, 0],
            x: [50, 50, 50, 130, 60, 60],
            y: [80, 80, 120, 170, 200, 200],
          }}
          transition={{
            duration: 5,
            delay: 0.3,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <MousePointer2 className="w-5 h-5 text-primary fill-primary/30" />
        </motion.div>
      </motion.div>

      <motion.p
        className="text-muted-foreground text-base max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Create trips in seconds. Invite your crew with one link.
      </motion.p>
    </div>
  );
};
