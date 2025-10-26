import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CATEGORIES, Category } from './ReplacesGridData';
import { cn } from '@/lib/utils';

export const ReplacesGrid = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Chravel — The Operating System for Group Travel
        </h2>
        <p className="text-xl sm:text-3xl text-foreground max-w-3xl mx-auto leading-relaxed">
          Chravel consolidates the core functions of your most-used apps when traveling — chat, calendars, polls, payments, and files and more— into one shared planning space built for your group.
          It's how travelers keep every plan, person, and payment perfectly in sync.
          No app switching. No chaos. Just Chravel.
        </p>
      </div>

      {/* Grid */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => (
          <CategoryRow
            key={category.key}
            category={category}
            isExpanded={expandedCategories.has(category.key)}
            onToggle={() => toggleCategory(category.key)}
          />
        ))}
      </div>

    </section>
  );
};

interface CategoryRowProps {
  category: Category;
  isExpanded: boolean;
  onToggle: () => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, isExpanded, onToggle }) => {
  const visibleApps = isExpanded 
    ? [...category.hero, ...category.full]
    : category.hero;
  
  const additionalCount = category.full.length;
  const hasMore = additionalCount > 0;

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4 transition-all duration-200">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-3xl sm:text-4xl font-semibold text-foreground">
          {category.title}
        </h3>
        
        {hasMore && (
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-lg text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-2 py-1"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Show fewer apps' : `See ${additionalCount} more apps`}
          >
            <span>
              {isExpanded ? 'Show fewer' : `See ${additionalCount}+ more`}
            </span>
            <ChevronDown 
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {/* App Chips */}
      <div className="flex flex-wrap gap-1.5">
        {visibleApps.map((app, index) => (
          <div
            key={`${app.name}-${index}`}
            className="bg-background/80 hover:bg-background border border-border/30 rounded-lg px-2.5 py-1.5 text-base text-foreground transition-colors duration-150"
          >
            {app.name}
          </div>
        ))}
      </div>
    </div>
  );
};
