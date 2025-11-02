import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CONSUMER_TRIP_CATEGORIES, PRO_TRIP_CATEGORIES, TripCategory } from '@/types/consumer';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TripCategorySelectorProps {
  tripId: string;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  isPro?: boolean;
}

export const TripCategorySelector = ({
  tripId,
  selectedCategories,
  onCategoriesChange,
  isPro = false
}: TripCategorySelectorProps) => {
  const { tier } = useConsumerSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if user can edit categories (Explorer+ for consumer, any authenticated for Pro trips)
  const canEdit = tier === 'explorer' || tier === 'frequent-chraveler' || isPro;
  
  const availableCategories = isPro ? PRO_TRIP_CATEGORIES : CONSUMER_TRIP_CATEGORIES;
  
  const toggleCategory = async (categoryId: string) => {
    if (!canEdit) {
      toast.error('Upgrade to Explorer to add trip categories');
      return;
    }
    
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setIsSaving(true);
    try {
      // Persist categories to database
      const { error } = await supabase
        .from('trips')
        .update({ categories: newCategories })
        .eq('id', tripId);
      
      if (error) throw error;
      
      onCategoriesChange(newCategories);
      toast.success('Categories updated');
    } catch (error) {
      console.error('Error updating categories:', error);
      toast.error('Failed to update categories');
    } finally {
      setIsSaving(false);
    }
  };
  
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      green: 'bg-green-500/20 text-green-300 border-green-500/30',
      purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      teal: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      red: 'bg-red-500/20 text-red-300 border-red-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      fuchsia: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      slate: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      sky: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      lime: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
      coral: 'bg-orange-400/20 text-orange-200 border-orange-400/30'
    };
    return colorMap[color] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Trip Categories
          {!canEdit && (
            <span className="ml-2 text-xs text-gray-500">(Upgrade to edit)</span>
          )}
        </label>
      </div>
      
      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(catId => {
            const category = availableCategories.find(c => c.id === catId);
            if (!category) return null;
            
            return (
              <div
                key={catId}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getColorClasses(category.color)}`}
              >
                {category.label}
                {canEdit && (
                  <button
                    onClick={() => toggleCategory(catId)}
                    disabled={isSaving}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Category Selector Dropdown */}
      {canEdit && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-left text-sm text-gray-300 hover:bg-white/10 transition-colors"
          >
            {selectedCategories.length === 0 
              ? 'Select trip categories...' 
              : 'Add more categories...'}
          </button>
          
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-64 overflow-auto">
                <div className="p-2 space-y-1">
                  {availableCategories.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          toggleCategory(category.id);
                        }}
                        disabled={isSaving}
                        className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          isSelected
                            ? getColorClasses(category.color)
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'opacity-100' : 'opacity-50'}`} 
                                style={{ backgroundColor: `var(--${category.color}-500)` }} />
                          {category.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {!canEdit && selectedCategories.length === 0 && (
        <p className="text-xs text-gray-500">No categories added yet</p>
      )}
    </div>
  );
};
