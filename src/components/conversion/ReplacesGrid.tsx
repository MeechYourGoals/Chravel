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
        <p className="text-white/90 font-semibold text-base sm:text-lg md:text-xl mt-6 md:mt-8 text-center max-w-4xl mx-auto">
          Travel 365 for when you're Out of Office 365.
        </p>
        <p className="text-white/90 font-medium text-sm sm:text-base md:text-lg mt-4 text-center max-w-4xl mx-auto">
          Spend less time logging in, signing up, and switching between different Apps — Consolidate the usage of the apps below into 8 core ChravelApp Tabs.
        </p>
      </div>

      {/* Accordion Grid */}
      <Accordion type="single" collapsible className="space-y-3">
        {CATEGORIES.map((category) => {
          const allApps = [...category.hero, ...category.full];
          
          return (
            <AccordionItem
              key={category.key}
              value={category.key}
              className="bg-card/25 backdrop-blur-sm border border-border/30 rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-card/40 transition-colors group [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon}</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
                    <span className="text-base sm:text-lg md:text-xl font-semibold text-foreground flex-shrink-0">
                      {category.title}
                    </span>
                    <span className="text-sm sm:text-base text-muted-foreground truncate">
                      {category.subtitle}
                    </span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground transition-transform duration-200 ml-2" />
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                {/* Expanded description */}
                <p className="text-sm sm:text-base text-muted-foreground mb-4 pl-9 sm:pl-11">
                  {category.expandedDescription}
                </p>
                
                {/* App chips */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pl-9 sm:pl-11">
                  {allApps.map((app, index) => (
                    <span
                      key={`${app.name}-${index}`}
                      className="bg-background/60 border border-border/40 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-foreground/90"
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
