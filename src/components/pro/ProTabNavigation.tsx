
import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../hooks/useDemoMode';
import { ProTab, isReadOnlyTab } from './ProTabsConfig';
import { ProTripCategory } from '../../types/proCategories';

interface ProTabNavigationProps {
  tabs: ProTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  category: ProTripCategory;
}

export const ProTabNavigation = ({ tabs, activeTab, onTabChange, category }: ProTabNavigationProps) => {
  const { accentColors } = useTripVariant();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const userRole = user?.proRole || 'staff';
  const userPermissions = user?.permissions || ['read'];
  
  const tabCount = tabs.length;
  const isCompactMode = tabCount > 8;

  return (
    <div className="flex whitespace-nowrap gap-2 mb-2 justify-start overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isReadOnly = isReadOnlyTab(tab.id, userRole, userPermissions, isDemoMode);
        const displayLabel =
          tab.id === 'team' && category === 'Content' ? 'Cast & Crew' : tab.label;
        
        const buttonSizeClass = isCompactMode 
          ? 'flex-shrink flex-grow-0 min-w-[90px]'
          : 'flex-1';
        
        const paddingClass = isCompactMode ? 'px-3' : 'px-3.5';
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 ${paddingClass} py-2.5 min-h-[42px] rounded-xl font-medium transition-all duration-200 text-sm ${buttonSizeClass} ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md`
                : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
            } ${isReadOnly ? 'opacity-75' : ''}`}
          >
            {Icon && <Icon size={16} />}
            {displayLabel}
            {tab.proOnly && (
              <Crown size={14} className={`text-${accentColors.primary}`} />
            )}
            {isReadOnly && (
              <Lock size={12} className="text-gray-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};
