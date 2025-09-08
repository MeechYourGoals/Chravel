import { ProTripCategory, getCategoryConfig } from '../types/proCategories';

export interface RoleOption {
  value: string;
  label: string;
  isCustom: boolean;
}

/**
 * Get available role options for a category, combining predefined and existing custom roles
 */
export const getRoleOptions = (category: ProTripCategory, existingRoles: string[]): RoleOption[] => {
  const categoryConfig = getCategoryConfig(category);
  const options: RoleOption[] = [];

  // Add predefined roles for the category
  categoryConfig.roles.forEach(role => {
    options.push({
      value: role,
      label: role,
      isCustom: false
    });
  });

  // Add existing custom roles (roles not in predefined list)
  const customRoles = existingRoles.filter(role => 
    !categoryConfig.roles.includes(role)
  );

  customRoles.forEach(role => {
    options.push({
      value: role,
      label: role,
      isCustom: true
    });
  });

  return options;
};

/**
 * Get unique roles from a list of participants
 */
export const extractUniqueRoles = (participants: Array<{ role: string }>): string[] => {
  const roles = participants.map(p => p.role).filter(Boolean);
  return [...new Set(roles)].sort();
};

/**
 * Validate a role name
 */
export const validateRole = (role: string): { isValid: boolean; error?: string } => {
  if (!role || !role.trim()) {
    return { isValid: false, error: 'Role cannot be empty' };
  }

  if (role.length > 50) {
    return { isValid: false, error: 'Role name must be 50 characters or less' };
  }

  if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(role)) {
    return { isValid: false, error: 'Role contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Normalize role name (trim whitespace, proper case)
 */
export const normalizeRole = (role: string): string => {
  return role.trim().replace(/\s+/g, ' ');
};

/**
 * Get role color class for badges
 */
export const getRoleColorClass = (role: string, category: ProTripCategory): string => {
  const categoryConfig = getCategoryConfig(category);
  
  // Use different colors for predefined vs custom roles
  if (categoryConfig.roles.includes(role)) {
    // Predefined roles get the primary red color
    return 'bg-red-600/20 text-red-400';
  } else {
    // Custom roles get a secondary blue color
    return 'bg-blue-600/20 text-blue-400';
  }
};

/**
 * Get role suggestions based on partial input
 */
export const getRoleSuggestions = (
  input: string, 
  existingRoles: string[], 
  category: ProTripCategory,
  limit: number = 5
): string[] => {
  const categoryConfig = getCategoryConfig(category);
  const allRoles = [...categoryConfig.roles, ...existingRoles];
  
  const filtered = allRoles.filter(role =>
    role.toLowerCase().includes(input.toLowerCase())
  );

  return [...new Set(filtered)].slice(0, limit);
};