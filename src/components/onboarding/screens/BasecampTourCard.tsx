/**
 * Basecamp Tour Card - Animated basecamp feature demo
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Check } from 'lucide-react';

export const BasecampTourCard = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Mock basecamp card */}
      <motion.div
        className="w-full max-w-sm bg-card border border-border rounded-xl p-5 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Basecamp header */}
        <motion.div 
          className="flex items-center gap-2 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <MapPin className="w-5 h-5 text-primary" />
          </motion.div>
          <span className="text-sm font-semibold text-primary">Basecamp</span>
        </motion.div>
        
        {/* Location name - types in */}
        <motion.div 
          className="bg-background/50 border border-border/50 rounded-lg p-3 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-xs text-muted-foreground block mb-1">Location</span>
          <motion.p
            className="text-foreground font-medium"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            Oceanview Inn
          </motion.p>
        </motion.div>
        
        {/* Address - appears after */}
        <motion.div 
          className="flex items-start gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>123 Ocean View Rd, Big Sur, CA</span>
        </motion.div>

        {/* Mini map placeholder */}
        <motion.div
          className="h-20 bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center mb-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3 }}
        >
          <motion.div
            className="flex flex-col items-center gap-1 text-muted-foreground"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2.5 }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 2.7, type: 'spring', stiffness: 300, damping: 12 }}
            >
              <MapPin className="w-6 h-6 text-primary" />
            </motion.div>
            <span className="text-xs">Map preview</span>
          </motion.div>
        </motion.div>
        
        {/* Saved confirmation */}
        <motion.div
          className="flex items-center justify-center gap-2 text-green-500 text-sm font-medium"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3.2, type: 'spring', stiffness: 400, damping: 15 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 3.4, type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Check className="w-4 h-4" />
          </motion.div>
          <span>Saved to trip</span>
        </motion.div>
      </motion.div>
      
      <motion.p
        className="text-muted-foreground text-base max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Save your hotel or Airbnb so everyone knows where to meet
      </motion.p>
    </div>
  );
};
