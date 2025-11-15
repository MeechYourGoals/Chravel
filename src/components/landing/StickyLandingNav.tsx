import React, { useState, useEffect } from 'react';

const sections = [
  { id: 'hero', title: 'Hero' },
  { id: 'problem-solution', title: 'Solution' },
  { id: 'ai-features', title: 'AI' },
  { id: 'use-cases', title: 'Use Cases' },
  { id: 'social-proof', title: 'Social Proof' },
  { id: 'replaces', title: 'Replaces' },
  { id: 'pricing', title: 'Pricing' },
];

const StickyLandingNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      sections.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) {
          observer.unobserve(el);
        }
      });
    };
  }, []);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full p-4 text-white z-50 bg-gradient-to-b from-black/50 to-transparent">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="text-2xl font-bold">
          Chravel
        </a>
        <div className="hidden md:flex items-center space-x-4">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(section.id);
              }}
              className={`transition-colors duration-300 ${
                activeSection === section.id
                  ? 'text-primary'
                  : 'text-white hover:text-primary/80'
              }`}
            >
              {section.title}
            </a>
          ))}
        </div>
        <a
          href="/signup"
          className="bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
        >
          Get Started
        </a>
      </div>
    </nav>
  );
};

export default StickyLandingNav;
