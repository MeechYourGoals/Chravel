/**
 * Feature Reel Screen - Cycles through all core trip features on one slide.
 *
 * Uses the same opacity/scale keyframe technique as WelcomeScreen's morphing
 * icons, but applied to full feature cards so the user sees every major
 * capability without extra slides.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Calendar,
  DollarSign,
  Sparkles,
  ClipboardList,
  BarChart3,
  Camera,
  MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  label: string;
  line: string;
  color: string;
  textColor: string;
}

const features: Feature[] = [
  {
    icon: MessageCircle,
    label: 'Group Chat',
    line: 'Message your crew in real time',
    color: 'bg-blue-500/20',
    textColor: 'text-blue-500',
  },
  {
    icon: Calendar,
    label: 'Shared Calendar',
    line: 'Plan the itinerary together',
    color: 'bg-green-500/20',
    textColor: 'text-green-500',
  },
  {
    icon: DollarSign,
    label: 'Split Payments',
    line: 'Track expenses and settle up easily',
    color: 'bg-emerald-500/20',
    textColor: 'text-emerald-500',
  },
  {
    icon: Sparkles,
    label: 'AI Concierge',
    line: 'Get restaurant and activity recs',
    color: 'bg-purple-500/20',
    textColor: 'text-purple-500',
  },
  {
    icon: ClipboardList,
    label: 'Shared Tasks',
    line: 'Assign to-dos so nothing gets missed',
    color: 'bg-orange-500/20',
    textColor: 'text-orange-500',
  },
  {
    icon: BarChart3,
    label: 'Polls & Votes',
    line: 'Let the group decide together',
    color: 'bg-pink-500/20',
    textColor: 'text-pink-500',
  },
  {
    icon: Camera,
    label: 'Shared Media',
    line: 'One album for all your trip photos',
    color: 'bg-cyan-500/20',
    textColor: 'text-cyan-500',
  },
  {
    icon: MapPin,
    label: 'Places & Map',
    line: 'Pin restaurants, hotels, and spots',
    color: 'bg-red-500/20',
    textColor: 'text-red-500',
  },
];

const CYCLE_INTERVAL_MS = 2500;

export const FeatureReelScreen = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % features.length);
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const current = features[activeIndex];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Cycling feature card */}
      <div className="relative w-full max-w-xs h-48 flex items-center justify-center mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {/* Icon circle */}
            <div
              className={`w-20 h-20 rounded-2xl ${current.color} flex items-center justify-center mb-4`}
            >
              <Icon className={`w-10 h-10 ${current.textColor}`} />
            </div>

            {/* Label */}
            <h2 className="text-xl font-bold text-foreground mb-1">{current.label}</h2>

            {/* One-liner */}
            <p className="text-muted-foreground text-sm max-w-[240px]">{current.line}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mini progress dots */}
      <div className="flex items-center gap-1.5 mb-6">
        {features.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Static heading */}
      <motion.p
        className="text-muted-foreground text-base max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Everything lives in your trip
      </motion.p>
    </div>
  );
};
