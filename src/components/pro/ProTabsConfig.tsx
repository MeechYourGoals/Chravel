import React from 'react';
import { Crown, Users, Calendar as CalendarIcon, DollarSign, Shield, Award, FileCheck, ClipboardList, BarChart3, Camera, Sparkles, MapPin } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ProTripCategory, getCategoryConfig } from '../../types/proCategories';

export interface ProTab {
  id: string;
  label: string;
  icon: LucideIcon | null;
  proOnly?: boolean;
  restrictedRoles?: string[];
  requiredPermissions?: string[];
}

// 🆕 Updated tab order: Chat, Calendar, Concierge, Media, Payments, Places, Polls, Tasks, Team
export const proTabs: ProTab[] = [
  { id: 'chat', label: 'Chat', icon: null },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'ai-chat', label: 'Concierge', icon: Sparkles },
  { id: 'media', label: 'Media', icon: Camera },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'places', label: 'Places', icon: MapPin },
  { id: 'polls', label: 'Polls', icon: BarChart3 },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'team', label: 'Team', icon: Users, proOnly: true, requiredPermissions: ['read'] },
  { id: 'finance', label: 'Finance', icon: DollarSign, proOnly: true, restrictedRoles: ['talent', 'cast', 'student'], requiredPermissions: ['finance'] },
  { id: 'medical', label: 'Medical', icon: Shield, proOnly: true, requiredPermissions: ['medical', 'admin'] },
  { id: 'compliance', label: 'Compliance', icon: FileCheck, proOnly: true, restrictedRoles: ['talent', 'cast', 'student'], requiredPermissions: ['compliance', 'admin'] },
  { id: 'sponsors', label: 'Sponsors', icon: Award, proOnly: true, requiredPermissions: ['admin'] }
];

export const getVisibleTabs = (userRole: string, userPermissions: string[], category?: ProTripCategory): ProTab[] => {
  let availableTabs = proTabs;
  
  // Filter tabs based on category if provided
  if (category) {
    const categoryConfig = getCategoryConfig(category);
    
    // Defensive check: if category is invalid, log error and show all tabs
    if (!categoryConfig) {
      console.error(`Invalid ProTripCategory: "${category}". Showing all tabs.`);
      return proTabs;
    }
    
    // 🆕 Media and Payments are now always available for enterprise trips
    availableTabs = proTabs.filter(tab => 
      !tab.proOnly || categoryConfig.availableTabs.includes(tab.id) || ['chat', 'places', 'ai-chat', 'media', 'payments'].includes(tab.id)
    );
  }
  
  return availableTabs.filter(tab => {
    // Check role-based restrictions
    if (tab.restrictedRoles && tab.restrictedRoles.includes(userRole.toLowerCase())) {
      return false;
    }
    
    // Check permission requirements
    if (tab.requiredPermissions && tab.requiredPermissions.length > 0) {
      const hasRequiredPermission = tab.requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );
      if (!hasRequiredPermission) {
        return false;
      }
    }
    
    return true;
  });
};

export const isReadOnlyTab = (tabId: string, userRole: string, userPermissions: string[], isDemoMode?: boolean): boolean => {
  // Demo mode overrides all read-only restrictions
  if (isDemoMode) return false;
  
  // Finance and compliance tabs are read-only for certain roles
  if ((tabId === 'finance' || tabId === 'compliance') && 
      ['talent', 'cast', 'student', 'artist'].includes(userRole.toLowerCase())) {
    return true;
  }
  
  // Check if user has write permissions
  if (!userPermissions.includes('write') && !userPermissions.includes('admin')) {
    return true;
  }
  
  return false;
};

export const hasTabAccess = (tabId: string, userRole: string, userPermissions: string[]): boolean => {
  const tab = proTabs.find(t => t.id === tabId);
  if (!tab) return false;
  
  // Check role restrictions
  if (tab.restrictedRoles && tab.restrictedRoles.includes(userRole.toLowerCase())) {
    return false;
  }
  
  // Check permission requirements
  if (tab.requiredPermissions && tab.requiredPermissions.length > 0) {
    return tab.requiredPermissions.some(permission => userPermissions.includes(permission));
  }
  
  return true;
};