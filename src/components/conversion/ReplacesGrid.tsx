import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CATEGORIES } from './ReplacesGridData';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const ReplacesGrid = () => {
  return (
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 md:mb-12">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 break-words">
          ChravelApp is the Operating System for Groups on the Go.
        </h2>
        <p 
          className="text-white font-bold text-lg sm:text-xl md:text-2xl mt-6 md:mt-8 text-center max-w-4xl mx-auto"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)' }}
        >
          Travel 365 for when you're Out of Office 365.
        </p>
        <p 
          className="text-white font-bold text-base sm:text-lg md:text-xl mt-4 text-center max-w-4xl mx-auto"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)' }}
        >
          Spend less time logging in, signing up, and switching between different Apps — Consolidate the usage of the apps below into 8 core ChravelApp Tabs.
        </p>
      </div>

      {/* Accordion Grid - Multi-open behavior */}
      <Accordion type="multiple" className="space-y-3">
        {CATEGORIES.map((category) => {
          const allApps = [...category.hero, ...category.full];
          
          return (
            <AccordionItem
              key={category.key}
              value={category.key}
              className="bg-card/25 backdrop-blur-sm border border-border/30 rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/40 transition-colors group [&[data-state=open]>svg]:rotate-180">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0 text-left">
                  {/* Icon + Title - Left aligned */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-2xl sm:text-3xl">{category.icon}</span>
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-white"
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {category.title}
                    </span>
                  </div>
                  {/* Subtitle - Centered with enhanced readability */}
                  <div className="flex-1 flex justify-center">
                    <span 
                      className="text-base sm:text-lg md:text-xl font-bold text-white text-center px-3 py-1 rounded-lg"
                      style={{ 
                        textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)',
                        backgroundColor: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      {category.subtitle}
                    </span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-white transition-transform duration-200 ml-2" />
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                {/* App chips */}
                <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center">
                  {allApps.map((app, index) => (
                    <span
                      key={`${app.name}-${index}`}
                      className="bg-background/70 border border-border/50 rounded-lg px-3 py-1.5 text-sm sm:text-base font-bold text-white"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    >
                      {app.name}
                    </span>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
};
