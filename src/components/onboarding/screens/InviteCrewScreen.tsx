/**
 * Invite Crew Screen - Shows the invite-link concept with avatars appearing.
 *
 * Addresses the biggest first-session gap: users need to know they can share
 * one link to get their whole crew into the trip instantly.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link2, UserPlus } from 'lucide-react';

const crewMembers = [
  { initial: 'S', bg: 'bg-blue-500' },
  { initial: 'M', bg: 'bg-orange-500' },
  { initial: 'A', bg: 'bg-green-500' },
];

export const InviteCrewScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Link icon with pulse ring */}
      <div className="relative mb-8">
        {/* Pulse rings */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.5 }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 1.8, delay: 0.4, repeat: Infinity, repeatDelay: 0.5 }}
        />

        {/* Icon circle */}
        <motion.div
          className="relative w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          <Link2 className="w-9 h-9 text-primary" />
        </motion.div>
      </div>

      {/* Crew avatars appearing one-by-one */}
      <div className="flex items-center gap-3 mb-6">
        {crewMembers.map((member, i) => (
          <motion.div
            key={member.initial}
            className={`w-12 h-12 rounded-full ${member.bg} flex items-center justify-center text-white font-semibold text-lg shadow-lg`}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 1.0 + i * 0.3,
              type: 'spring',
              stiffness: 350,
              damping: 16,
            }}
          />
        ))}

        {/* Plus icon for "and more" */}
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.0, type: 'spring', stiffness: 300, damping: 18 }}
        >
          <UserPlus className="w-5 h-5 text-muted-foreground/60" />
        </motion.div>
      </div>

      <motion.h2
        className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        One link. Everyone's in.
      </motion.h2>

      <motion.p
        className="text-muted-foreground text-base sm:text-lg max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Share an invite link and your crew joins instantly
      </motion.p>
    </div>
  );
};
