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
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 md:mb-12">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 break-words">
          The Operating System for Group Trips & Events
        </h2>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white font-medium max-w-3xl mx-auto leading-relaxed break-words">
          Bring your most-used travel and event needs into one shared planning space. Chravel keeps every plan, person, and payment in sync — less app-switching, less confusion.
        </p>
        <p className="text-white font-semibold text-base sm:text-lg md:text-xl mt-4 md:mt-6 text-center max-w-3xl mx-auto">
          Use it for: family trips, youth sports, wedding weekends, group retreats, tours, and corporate events.
        </p>
        <p className="text-white/90 font-semibold text-base sm:text-lg md:text-xl mt-6 md:mt-8 text-center max-w-4xl mx-auto">
          Your group's "Travel 365" — for when you're Out of Office 365.
        </p>
        <p className="text-white/90 font-medium text-sm sm:text-base md:text-lg mt-4 text-center max-w-4xl mx-auto">
          Spend less time logging in, signing up, and switching between the multiple apps below — Chravel brings your files, photos, docs, and more into Tabs instead of separate Apps.
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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile breakpoint
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allApps = [...category.hero, ...category.full];
  const displayLimit = isMobile ? 18 : 16;
  const needsExpansion = allApps.length > displayLimit;
  
  const visibleApps = isExpanded ? allApps : allApps.slice(0, displayLimit);
  const hiddenCount = Math.max(0, allApps.length - displayLimit);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4 transition-all duration-200">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-foreground break-words">
          {category.title}
        </h3>
        
        {needsExpansion && (
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 md:gap-2 text-sm sm:text-base text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-2 py-1 flex-shrink-0"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Show fewer apps' : `See ${hiddenCount}+ more apps`}
          >
            <span>
              {isExpanded ? 'Show fewer' : `See ${hiddenCount}+ more`}
            </span>
            <ChevronDown 
              className={cn(
                "w-3 h-3 md:w-4 md:h-4 transition-transform duration-200",
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
            className="bg-background/80 hover:bg-background border border-border/30 rounded-lg px-2.5 py-1.5 text-sm sm:text-base md:text-lg text-foreground transition-colors duration-150 break-words"
          >
            {app.name}
          </div>
        ))}
      </div>
    </div>
  );
};
