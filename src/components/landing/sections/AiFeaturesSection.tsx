import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, Compass, BellRing, ScrollText, DollarSign, BarChart3 } from 'lucide-react';
import aiConcierge from '@/assets/app-screenshots/ai-concierge.png';
import placesMaps from '@/assets/app-screenshots/places-maps.png';

export const AiFeaturesSection = () => {
  // Group 1 - aligned with AI Concierge screenshot
  const aiFeatures1 = [
    {
      icon: <Wand2 className="text-accent" size={28} />,
      title: 'Context-Aware Concierge',
      description: 'AI that understands your trip — not just your question.'
    },
    {
      icon: <DollarSign className="text-primary" size={28} />,
      title: 'Payment Tracking',
      description: 'Keep track of who owes what, without the spreadsheets'
    },
    {
      icon: <BarChart3 className="text-accent" size={28} />,
      title: 'Decision Lock-In',
      description: 'Persistent Poll View: No more scrolling to see who voted on what 3 weeks ago.'
    }
  ];

  // Group 2 - aligned with Places screenshot
  const aiFeatures2 = [
    {
      icon: <Compass className="text-primary" size={28} />,
      title: 'BaseCamps',
      description: 'No more fumbling to find the Airbnb or hotel address. Store it once for all trip members.'
    },
    {
      icon: <BellRing className="text-accent" size={28} />,
      title: 'Relevant Notifications',
      description: 'Important updates without the message overload. You choose what matters'
    },
    {
      icon: <ScrollText className="text-primary" size={28} />,
      title: 'Chravel Recap PDFs',
      description: 'Overwhelmed or want to Share off App? Get a Simple Summary PDF of the trip'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
    <div className="container mx-auto px-4 py-8 md:py-0 flex flex-col items-center justify-start md:justify-center min-h-screen space-y-8 md:space-y-12">
      {/* Headline - bold white text with shadow for contrast */}
      <motion.div 
        className="text-center space-y-4 max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Travel Intelligence: AI that understands your trip.
        </h2>
        <p
          className="text-lg sm:text-xl md:text-2xl text-white/90 font-medium max-w-3xl mx-auto"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
        >
          It reads your itinerary, places, tasks, and group decisions—so answers are actually useful.
        </p>
      </motion.div>

      {/* Split Layout: 2 Rows with Screenshot + 3 Pills each */}
      <div className="max-w-7xl w-full space-y-6 md:space-y-8">
        {/* Row 1: AI Concierge Screenshot + 3 Pills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Left: AI Concierge Screenshot */}
          <motion.div 
            className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={aiConcierge} 
              alt="AI Concierge providing personalized recommendations" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Right: 3 Pills matching screenshot height */}
          <motion.div 
            className="grid grid-rows-3 gap-3 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {aiFeatures1.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 hover:border-accent/50 transition-all duration-300 group flex items-center"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-accent/10 p-3 rounded-xl group-hover:bg-accent/20 transition-colors flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-xl mb-1 leading-tight">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Row 2: Places Screenshot + 3 Pills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Left: Places Screenshot */}
          <motion.div 
            className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-accent/30 transition-all duration-300"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <img 
              src={placesMaps} 
              alt="Interactive maps and places discovery" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Right: 3 Pills matching screenshot height */}
          <motion.div 
            className="grid grid-rows-3 gap-3 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {aiFeatures2.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 hover:border-accent/50 transition-all duration-300 group flex items-center"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-accent/10 p-3 rounded-xl group-hover:bg-accent/20 transition-colors flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-xl mb-1 leading-tight">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
