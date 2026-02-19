/**
 * Shared layout for settings screens (Consumer, Enterprise, Events).
 * Provides responsive sidebar (desktop) / dropdown (mobile) + content area.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
}

interface SettingsLayoutProps {
  title: string;
  /** Optional subtitle for desktop sidebar */
  subtitle?: string;
  sections: SettingsSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  children,
}) => {
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const currentSection = sections.find(s => s.id === activeSection);

  const sectionButtonClass = (isActive: boolean) =>
    isActive
      ? 'bg-glass-orange/20 text-glass-orange border border-glass-orange/30'
      : 'text-muted-foreground hover:text-foreground hover:bg-white/10 text-gray-300 hover:text-white';

  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full min-w-0">
        <div className="flex-shrink-0 p-3 md:p-4 border-b border-white/20">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between p-2 md:p-3 bg-white/10 rounded-xl text-white"
          >
            <div className="flex items-center gap-3">
              {currentSection && <currentSection.icon size={20} />}
              <span className="text-sm">{currentSection?.label}</span>
            </div>
            <ChevronDown
              size={20}
              className={`transform transition-transform duration-200 ${showMobileMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showMobileMenu && (
            <div className="mt-2 bg-white/10 rounded-xl overflow-hidden animate-fade-in">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      onSectionChange(section.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 text-left transition-colors ${sectionButtonClass(
                      activeSection === section.id,
                    )}`}
                  >
                    <Icon size={20} />
                    <span className="flex-1 text-sm">{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-3 md:p-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0">
      <aside className="w-64 flex-shrink-0 bg-white/5 backdrop-blur-md border-r border-white/10 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
        <nav className="space-y-1.5">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${sectionButtonClass(
                  activeSection === section.id,
                )}`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left text-sm">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 pb-16">{children}</div>
      </main>
    </div>
  );
};
