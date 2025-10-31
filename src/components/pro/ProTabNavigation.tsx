
import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useAuth } from '../../hooks/useAuth';
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

  const userRole = user?.proRole || 'staff';
  const userPermissions = user?.permissions || ['read'];

  return (
    <div className="flex whitespace-nowrap gap-2 mb-2 justify-start">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isReadOnly = isReadOnlyTab(tab.id, userRole, userPermissions);
        const displayLabel =
          tab.id === 'team' && category === 'Content' ? 'Cast & Crew' : tab.label;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium transition-all duration-200 text-sm flex-1 ${
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
