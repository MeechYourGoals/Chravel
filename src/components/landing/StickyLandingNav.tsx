import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { DemoModeSelector } from '../DemoModeSelector';
import { Link } from 'react-router-dom';

interface NavSection {
  id: string;
  label: string;
}

const sections: NavSection[] = [
  { id: 'hero', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How It Works' },
  { id: 'ai', label: 'AI' },
  { id: 'use-cases', label: 'Use Cases' },
  { id: 'storage', label: 'Storage' },
  { id: 'proof', label: 'Reviews' },
  { id: 'replaces', label: 'Compare' },
  { id: 'faq', label: 'FAQ' },
  { id: 'pricing', label: 'Pricing' }
];

interface StickyLandingNavProps {
  onSignUp: () => void;
}

export const StickyLandingNav: React.FC<StickyLandingNavProps> = ({ onSignUp }) => {
  const [activeSection, setActiveSection] = useState('hero');
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav after scrolling past hero
      setIsVisible(window.scrollY > window.innerHeight * 0.3);

      // Calculate scroll progress
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setScrollProgress(Math.min(progress, 100));

      // Update active section based on scroll position
      const sections = document.querySelectorAll('[id^="section-"]');
      let current = 'hero';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 3 && rect.bottom >= window.innerHeight / 3) {
          current = section.id.replace('section-', '');
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-transform duration-300 bg-background/80 backdrop-blur-lg border-b border-border/50',
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-0.5 bg-primary transition-all duration-300" style={{ width: `${scrollProgress}%` }} />

      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Chravel
        </div>

        {/* For Teams Link (Desktop) */}
        <div className="hidden lg:flex items-center">
          <Link 
            to="/teams" 
            className="text-sm font-medium text-foreground hover:text-primary transition-colors px-4 py-2 rounded-md hover:bg-accent/10"
          >
            For Teams
          </Link>
        </div>

        {/* Section Dots (Desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'group relative h-2 rounded-full transition-all duration-300',
                activeSection === section.id
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted hover:bg-muted-foreground'
              )}
              aria-label={`Go to ${section.label}`}
            >
              {/* Tooltip on hover */}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs whitespace-nowrap bg-background/90 px-2 py-1 rounded pointer-events-none">
                {section.label}
              </span>
            </button>
          ))}
        </div>

        {/* Active Section Name (Desktop) */}
        <div className="hidden lg:block text-sm text-foreground font-medium min-w-[100px] text-center">
          {sections.find(s => s.id === activeSection)?.label || 'Home'}
        </div>

        {/* Right: Demo Selector Only (Auth CTA is centered in hero content) */}
        <div className="flex items-center gap-2">
          <DemoModeSelector />
        </div>
      </div>
    </nav>
  );
};
