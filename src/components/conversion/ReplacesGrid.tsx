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
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 pt-8 sm:pt-6 pb-12 sm:pb-16">
      {/* Header with FAQ-style bold typography */}
      <div className="text-center mb-8 md:mb-12 space-y-4 max-w-4xl mx-auto px-2">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Why Juggle a Dozen Apps for ONE Trip?
        </h2>
        <p
          className="text-base sm:text-lg md:text-xl text-white font-semibold mt-4"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Tap any tab below to see what ChravelApp replaces.
        </p>

        {/* Placeholder for ChravelTabs screenshot */}
        <div className="mt-8 mb-4">{/* Screenshot of ChravelTabs will be inserted here */}</div>
      </div>

      {/* Accordion */}
      <Accordion type="multiple" className="divide-y divide-white/10 border-y border-white/10">
        {CATEGORIES.map(category => {
          const allApps = [...category.hero, ...category.full];

          return (
            <AccordionItem key={category.key} value={category.key} className="border-none">
              <AccordionTrigger className="px-2 sm:px-4 py-5 sm:py-4 hover:no-underline hover:bg-white/[0.03] transition-colors group [&[data-state=open]>div>svg]:rotate-180 [&[data-state=open]>div>div>svg]:rotate-180">
                {/* Desktop/Tablet: 3-column grid (md and up) */}
                <div className="hidden md:grid grid-cols-[200px_1fr_40px] lg:grid-cols-[220px_1fr_40px] gap-4 items-center w-full">
                  <span
                    className="text-xl lg:text-2xl font-bold text-white text-left"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {category.title}
                  </span>
                  <div className="text-left">
                    {category.benefitQuote && (
                      <span className="block text-sm text-white/70 italic mb-0.5">
                        {category.benefitQuote}
                      </span>
                    )}
                    <span className="text-sm lg:text-base text-white italic font-medium">
                      {category.benefit}
                    </span>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-white transition-transform duration-200 justify-self-end" />
                </div>

                {/* Mobile: Center-aligned, full-width layout */}
                <div className="flex flex-col w-full md:hidden text-center">
                  {/* Feature Name - Large, bold, pure white with glow */}
                  <h3
                    className="text-2xl sm:text-3xl font-bold text-white mb-2"
                    style={{
                      textShadow: '0 0 10px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.6)',
                    }}
                  >
                    {category.title}
                  </h3>

                  {/* Optional quote - above description */}
                  {category.benefitQuote && (
                    <span
                      className="block text-sm text-white/80 italic mb-1"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    >
                      {category.benefitQuote}
                    </span>
                  )}

                  {/* Description - Bright white, italic, readable, full width */}
                  <p
                    className="text-base sm:text-lg text-white italic font-medium leading-relaxed mb-3"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                  >
                    {category.benefit}
                  </p>

                  {/* Expand indicator - centered chevron */}
                  <div className="flex justify-center">
                    <ChevronDown className="h-5 w-5 text-white/70 transition-transform duration-200" />
                  </div>
                </div>
              </AccordionTrigger>

              {/* Expanded Content */}
              <AccordionContent className="px-2 sm:px-4 pb-5">
                {/* Mobile: Center-aligned chips */}
                <div className="md:hidden">
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-1 font-semibold text-center">
                    Replaces:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {allApps.map((app, index) => (
                      <span
                        key={`${app.name}-${index}`}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold text-white"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                      >
                        {app.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Desktop/Tablet: Left-aligned chips */}
                <div className="hidden md:block">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3 mt-2 font-medium">
                    Replaces:
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {allApps.map((app, index) => (
                      <span
                        key={`${app.name}-${index}-desktop`}
                        className="bg-background/70 border border-border/50 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                      >
                        {app.name}
                      </span>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Bottom text */}
      <div className="text-center mt-8 md:mt-12 max-w-4xl mx-auto px-2">
        <p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-bold"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          ChravelApp's 8 core tabs cover almost all trip needs—with one app.
        </p>
      </div>
    </section>
  );
};
