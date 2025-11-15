import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface NavSection {
  id: string;
  label: string;
}

const sections: NavSection[] = [
  { id: 'hero', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'ai', label: 'AI' },
  { id: 'use-cases', label: 'Use Cases' },
  { id: 'proof', label: 'Reviews' },
  { id: 'replaces', label: 'Compare' },
  { id: 'pricing', label: 'Pricing' }
];

interface StickyLandingNavProps {
  onSignUp: () => void;
}

export const StickyLandingNav: React.FC<StickyLandingNavProps> = ({ onSignUp }) => {
  const [activeSection, setActiveSection] = useState('hero');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav after scrolling past hero
      setIsVisible(window.scrollY > window.innerHeight * 0.3);

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
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Chravel
        </div>

        {/* Section Dots (Desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                activeSection === section.id
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted hover:bg-muted-foreground'
              )}
              aria-label={`Go to ${section.label}`}
            />
          ))}
        </div>

        {/* CTA */}
        <Button 
          onClick={onSignUp}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Get Started
        </Button>
      </div>
    </nav>
  );
};
