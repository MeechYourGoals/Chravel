/**
 * AI Concierge Teaser Screen - Simulated AI chat
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin } from 'lucide-react';

const recommendations = [
  { name: 'Bixby Bridge Viewpoint', type: 'Scenic', icon: '🌉' },
  { name: 'Pfeiffer Beach', type: 'Beach', icon: '🏖️' },
  { name: 'McWay Falls Trail', type: 'Hiking', icon: '🥾' },
];

const TypingIndicator = () => (
  <div className="flex gap-0.5 px-3 py-2">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
        animate={{ y: [0, -3, 0] }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
  </div>
);

export const AIConciergeTeaser = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Mock AI chat container */}
      <motion.div
        className="w-full max-w-sm bg-card border border-border rounded-xl p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-medium text-foreground">AI Concierge</span>
        </div>

        {/* User message */}
        <motion.div
          className="flex justify-end mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-primary text-primary-foreground rounded-2xl px-3 py-2 max-w-[80%]">
            <p className="text-sm">What should we do in Big Sur?</p>
          </div>
        </motion.div>

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.8, duration: 1.5, times: [0, 0.1, 0.9, 1] }}
        >
          <TypingIndicator />
        </motion.div>

        {/* AI response with recommendations */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3 }}
        >
          <div className="bg-muted rounded-2xl px-3 py-2">
            <p className="text-sm text-left mb-2">
              Here are the top spots for your Big Sur trip! 🌊
            </p>
          </div>

          {recommendations.map((rec, i) => (
            <motion.div
              key={rec.name}
              className="bg-background border border-border rounded-lg p-3 flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.5 + i * 0.2 }}
            >
              <span className="text-2xl">{rec.icon}</span>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-foreground">{rec.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{rec.type}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.p
        className="text-muted-foreground text-base max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Your AI travel assistant plans the details
      </motion.p>
    </div>
  );
};
