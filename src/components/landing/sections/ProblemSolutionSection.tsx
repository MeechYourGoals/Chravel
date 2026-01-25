import React from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, Share2, RefreshCw } from 'lucide-react';
import createNewTrip from '@/assets/app-screenshots/create-trip-modal-correct.png';
import tripInviteCoachella from '@/assets/app-screenshots/trip-invite-coachella.png';
import oneHubChat from '@/assets/landing/one-hub-chat-cropped.png';

export const ProblemSolutionSection = () => {
  const steps = [
    {
      number: 1,
      icon: <CalendarPlus size={32} className="text-primary" />,
      title: "Create a trip",
      description: "Name it. Add Details. Done."
    },
    {
      number: 2,
      icon: <Share2 size={32} className="text-accent" />,
      title: "Invite your group",
      description: "One Link. Easily Shared"
    },
    {
      number: 3,
      icon: <RefreshCw size={32} className="text-primary" />,
      title: "Everything syncs",
      description: "Calendar, Tasks, and last minute changes — Updated Live"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-start md:justify-center min-h-screen space-y-4 md:space-y-10">
      {/* Headline */}
      <motion.div 
        className="text-center space-y-4 max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.5)' }}
        >
          How It Works
        </h2>
        <p 
          className="text-lg sm:text-xl md:text-2xl font-semibold text-white/90"
          style={{ textShadow: '2px 2px 6px rgba(0, 0, 0, 0.6)' }}
        >
          From zero → organized in under 60 seconds
        </p>
      </motion.div>

      {/* Steps - Horizontal on desktop, vertical on mobile */}
      <div className="w-full max-w-6xl">
        {/* Desktop View (Hidden on mobile/tablet) */}
        <motion.div 
          className="hidden lg:flex items-center justify-between gap-4 relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Card */}
              <motion.div 
                className="flex-1 min-w-0 overflow-hidden bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-all duration-300 relative z-10"
                variants={itemVariants}
              >
                {/* Number Badge */}
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                
                {/* Content */}
                <h3 className="font-bold text-xl md:text-2xl mb-2 text-foreground break-words">
                  {step.title}
                </h3>
                <p className="text-lg text-accent font-medium break-words">
                  {step.description}
                </p>
              </motion.div>

              {/* Connecting Arrow (not after last step) */}
              {index < steps.length - 1 && (
                <div className="flex-shrink-0 w-12 h-1 bg-gradient-to-r from-primary to-accent relative" 
                     style={{ marginLeft: '-1rem', marginRight: '-1rem', zIndex: 0 }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-accent" />
                </div>
              )}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Mobile/Tablet View (Hidden on desktop) */}
        <motion.div 
          className="lg:hidden space-y-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step) => (
            <motion.div 
              key={step.number} 
              className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 w-full overflow-hidden"
              variants={itemVariants}
            >
              {/* Inline Step Number + Icon */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {step.number}
                </div>
                {step.icon}
              </div>

              {/* Content - white bold text for readability */}
              <div className="text-center">
                <h3 className="font-bold text-xl mb-2 text-white break-words" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
                  {step.title}
                </h3>
                <p className="text-lg text-white font-semibold break-words" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Screenshots Row - Two cards centered and staggered */}
      <motion.div 
        className="w-full max-w-4xl"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Desktop: Three columns aligned under steps */}
        <div className="hidden lg:flex justify-center items-start gap-6">
          {/* Column 1: Create Trip - Under "Create a trip" */}
          <motion.div 
            className="flex flex-col items-center flex-1 max-w-[300px]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span 
              className="text-white font-semibold text-lg mb-3"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Create Trip
            </span>
            <div className="w-full h-[520px] flex items-center justify-center rounded-2xl">
              <img 
                src={createNewTrip}
                alt="Create New Trip form interface"
                className="w-full h-full object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
              />
            </div>
          </motion.div>

          {/* Column 2: Trip Invite - Under "Invite your group" */}
          <motion.div 
            className="flex flex-col items-center flex-1 max-w-[300px]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span 
              className="text-white font-semibold text-lg mb-3"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Trip Invite
            </span>
            <div className="w-full h-[520px] flex items-center justify-center">
              <img 
                src={tripInviteCoachella}
                alt="Coachella trip invite card showing invitation interface"
                className="w-full h-auto max-h-full object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
              />
            </div>
          </motion.div>

          {/* Column 3: One Hub - Under "Everything syncs" */}
          <motion.div 
            className="flex flex-col items-center flex-1 max-w-[300px]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <span 
              className="text-white font-semibold text-lg mb-3"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              One Hub
            </span>
            <div className="w-full h-[520px] flex items-center justify-center rounded-2xl">
              <img 
                src={oneHubChat}
                alt="Trip chat interface showing group messages and activity"
                className="w-full h-full object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
              />
            </div>
          </motion.div>
        </div>

        {/* Mobile/Tablet: Stacked in progressive order */}
        <div className="lg:hidden flex flex-col items-center gap-6">
          {/* Create Trip */}
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span 
              className="text-white font-semibold text-base mb-2"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Create Trip
            </span>
            <div className="max-w-[300px] rounded-xl">
              <img 
                src={createNewTrip}
                alt="Create New Trip form interface"
                className="w-full h-auto rounded-xl shadow-xl border border-border/50"
              />
            </div>
          </motion.div>

          {/* Trip Invite */}
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span 
              className="text-white font-semibold text-base mb-2"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              Trip Invite
            </span>
            <div className="max-w-[300px]">
              <img 
                src={tripInviteCoachella}
                alt="Coachella trip invite card showing invitation interface"
                className="w-full h-auto rounded-xl shadow-xl border border-border/50"
              />
            </div>
          </motion.div>

          {/* One Hub */}
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span 
              className="text-white font-semibold text-base mb-2"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
            >
              One Hub
            </span>
            <div className="max-w-[300px] rounded-xl">
              <img 
                src={oneHubChat}
                alt="Trip chat interface showing group messages and activity"
                className="w-full h-auto rounded-xl shadow-xl border border-border/50"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
