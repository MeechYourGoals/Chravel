/**
 * Welcome Screen - Hero animation with morphing icons
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Luggage, Map, MessageCircle } from 'lucide-react';

export const WelcomeScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Morphing icon animation */}
      <div className="relative w-24 h-24 mb-8">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ 
            opacity: [1, 0, 0, 0, 1],
            scale: [1, 0.8, 0.8, 0.8, 1],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Luggage className="w-10 h-10 text-primary" />
          </div>
        </motion.div>
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 1, 0, 0, 0],
            scale: [0.8, 1, 0.8, 0.8, 0.8],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Map className="w-10 h-10 text-accent" />
          </div>
        </motion.div>
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 0, 1, 0, 0],
            scale: [0.8, 0.8, 1, 0.8, 0.8],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
        </motion.div>
      </div>

      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Plan group trips without the chaos
      </motion.h1>

      <motion.p
        className="text-muted-foreground text-base sm:text-lg max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Everything your crew needs in one place
      </motion.p>
    </div>
  );
};
