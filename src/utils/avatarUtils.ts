/**
 * Utility functions for consistent avatar display across the application
 */

/**
 * Extracts initials from a person's name
 * @param name - Full name of the person
 * @returns Two-letter initials (first and last name)
 */
export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return 'U';
  
  const names = name.trim().split(' ').filter(Boolean);
  
  if (names.length === 0) return 'U';
  if (names.length === 1) return names[0][0].toUpperCase();
  
  // First and last name initials
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

/**
 * Checks if an avatar URL is likely to be valid
 * @param avatarUrl - The avatar URL to check
 * @returns boolean indicating if URL appears valid
 */
export const isValidAvatarUrl = (avatarUrl?: string | null): boolean => {
  if (!avatarUrl) return false;
  
  // Check for valid URL format and common image extensions
  try {
    const url = new URL(avatarUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const MALE_NAMES = ['james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'donald', 'mark', 'paul', 'steven', 'andrew', 'kenneth', 'joshua', 'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory', 'frank', 'alexander', 'raymond', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'henry', 'nathan', 'douglas', 'zachary', 'peter', 'kyle', 'walter', 'ethan', 'jeremy', 'harold', 'keith', 'christian', 'roger', 'noah', 'gerald', 'carl', 'terry', 'sean', 'austin', 'arthur', 'lawrence', 'jesse', 'dylan', 'bryan', 'joe', 'jordan', 'billy', 'bruce', 'albert', 'willie', 'gabriel', 'logan', 'alan', 'juan', 'wayne', 'roy', 'ralph', 'randy', 'eugene', 'vincent', 'russell', 'elijah', 'louis', 'bobby', 'philip', 'johnny', 'marcus', 'jamal', 'darius', 'terrell', 'jerome'];
const FEMALE_NAMES = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'shirley', 'angela', 'helen', 'anna', 'brenda', 'pamela', 'nicole', 'emma', 'samantha', 'katherine', 'christine', 'debra', 'rachel', 'catherine', 'janet', 'ruth', 'maria', 'diane', 'virginia', 'julie', 'joyce', 'victoria', 'olivia', 'kelly', 'christina', 'lauren', 'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea', 'hannah', 'martha', 'jacqueline', 'frances', 'gloria', 'ann', 'teresa', 'kathryn', 'sara', 'janice', 'jean', 'alice', 'madison', 'doris', 'rose', 'julia', 'judy', 'grace', 'denise', 'abigail', 'marie', 'diana', 'theresa', 'beverly', 'isabella', 'sophia', 'charlotte', 'mia', 'amelia', 'harper', 'evelyn', 'abigail', 'emily', 'elizabeth', 'sofia', 'avery', 'ella', 'scarlett', 'grace', 'chloe', 'victoria', 'riley', 'aria', 'lily', 'aubrey', 'zoey', 'penelope', 'lillian', 'nora', 'mila', 'hazel', 'ellie', 'leah', 'stella', 'aurora', 'claire', 'lucy', 'paisley', 'everly', 'caroline', 'nova', 'genesis', 'emilia', 'kennedy', 'maya'];

/**
 * Returns a gendered silhouette emoji based on the name.
 * @param name - The name to check.
 * @returns A gendered emoji or a default one.
 */
export const getGenderedAvatar = (name: string): string => {
  if (!name || typeof name !== 'string') return '👤';
  const firstName = name.trim().split(' ')[0].toLowerCase();
  if (MALE_NAMES.includes(firstName)) {
    return '👨';
  }
  if (FEMALE_NAMES.includes(firstName)) {
    return '👩';
  }
  return '👤';
}