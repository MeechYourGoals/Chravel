
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ProCategoryEnum, PRO_CATEGORIES_ORDERED, getCategoryConfig, getCategoryLabel } from '../../types/proCategories';

interface CategorySelectorProps {
  selectedCategory: ProCategoryEnum;
  onCategoryChange: (category: ProCategoryEnum) => void;
  className?: string;
}

export const CategorySelector = ({ selectedCategory, onCategoryChange, className = '' }: CategorySelectorProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const categories = PRO_CATEGORIES_ORDERED;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl transition-colors min-w-[200px] justify-between"
      >
        <span className="text-sm font-medium">{getCategoryLabel(selectedCategory)}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div 
            className="fixed inset-0 z-[59]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu with higher z-index and better positioning */}
          <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-[60] overflow-hidden max-h-72 overflow-y-auto mb-20 touch-pan-y">
            {categories.map((catConfig) => {
              return (
                <button
                  key={catConfig.id}
                  onClick={() => {
                    onCategoryChange(catConfig.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-700 border-b border-gray-700 last:border-b-0 ${
                    selectedCategory === catConfig.id ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <div className="font-medium">{catConfig.label}</div>
                  <div className="text-xs text-gray-400 mt-1 leading-relaxed">{catConfig.description}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
