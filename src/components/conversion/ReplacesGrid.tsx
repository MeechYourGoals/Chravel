import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CATEGORIES } from './ReplacesGridData';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const ReplacesGrid = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 lg:px-12 pt-8 sm:pt-6 pb-12 sm:pb-16">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12 space-y-3">
        <h2 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white break-words"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
        >
          Your trip shouldn't need 10+ apps
        </h2>
        <p 
          className="text-lg sm:text-xl md:text-2xl text-white font-medium max-w-4xl mx-auto"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
        >
          Download Overload? ChravelApp consolidates dozens of scattered Apps into 8 simple ChravelTabs
        </p>
        <p 
          className="text-base sm:text-lg text-white/80 font-medium mt-4"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
        >
          Ready to Replace your App Arsenal? Navigate your trips faster with Tabs:
        </p>
      </div>

      {/* Accordion */}
      <Accordion type="multiple" className="divide-y divide-white/10 border-y border-white/10">
        {CATEGORIES.map((category) => {
          const allApps = [...category.hero, ...category.full];
          
          return (
            <AccordionItem
              key={category.key}
              value={category.key}
              className="border-none"
            >
              <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-white/[0.03] transition-colors group [&[data-state=open]>div>svg]:rotate-180 [&[data-state=open]>div>div>svg]:rotate-180">
                {/* Desktop: 3-column grid */}
                <div className="hidden md:grid grid-cols-[220px_1fr_40px] gap-4 items-center w-full">
                  <span 
                    className="text-lg md:text-xl font-bold text-white text-left"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {category.title}
                  </span>
                  <div className="text-left">
                    {category.benefitQuote && (
                      <span className="block text-sm text-white/60 italic mb-0.5">
                        {category.benefitQuote}
                      </span>
                    )}
                    <span className="text-sm md:text-base text-white/70 font-normal">
                      {category.benefit}
                    </span>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-white transition-transform duration-200 justify-self-end" />
                </div>
                
                {/* Mobile: Stacked layout */}
                <div className="flex flex-col w-full md:hidden text-left">
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-lg font-bold text-white"
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                    >
                      {category.title}
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-white transition-transform duration-200" />
                  </div>
                  <div className="mt-1">
                    {category.benefitQuote && (
                      <span className="block text-xs text-white/60 italic mb-0.5">
                        {category.benefitQuote}
                      </span>
                    )}
                    <span className="text-sm text-white/70 font-normal">
                      {category.benefit}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-3 mt-2 font-medium">
                  Replaces:
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {allApps.map((app, index) => (
                    <span
                      key={`${app.name}-${index}`}
                      className="bg-background/70 border border-border/50 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
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
