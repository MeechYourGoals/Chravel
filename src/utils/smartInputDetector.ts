export type InputType = 'url' | 'place_name';

export interface SmartInputResult {
  type: InputType;
  isValid: boolean;
  suggestions?: string[];
}

// URL patterns to detect various URL formats
const URL_PATTERNS = [
  /^https?:\/\/.+/i,
  /^www\..+\..+/i,
  /\.(com|org|net|edu|gov|co|io|ai|app|ly|me|tv|fm|xyz|biz|info)[\s/]?/i,
];

// Common business name patterns followed by location indicators
const PLACE_NAME_PATTERNS = [
  /(.+)\s+(in|at|near|@)\s+([a-zA-Z\s,]+)/i, // "Starbucks in Chicago, IL"
  /(.+),\s*([a-zA-Z\s,]+)/i, // "Central Park, New York"
  /(.+)\s+([A-Z]{2,})\s*(\d{5})?/i, // "Target Chicago IL 60601"
];

// Extract business name and location from place name input
export const extractPlaceComponents = (input: string) => {
  const cleaned = input.trim();

  // Try to match different patterns
  for (const pattern of PLACE_NAME_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      return {
        businessName: match[1]?.trim(),
        location: match[2]?.trim() || match[3]?.trim(),
        fullLocation: `${match[2]?.trim() || ''} ${match[3]?.trim() || ''}`.trim(),
      };
    }
  }

  // If no pattern matches, assume the whole thing is a business name
  return {
    businessName: cleaned,
    location: '',
    fullLocation: '',
  };
};

// Detect if input is a URL or place name
export const detectInputType = (input: string): SmartInputResult => {
  const trimmed = input.trim();

  if (!trimmed) {
    return { type: 'place_name', isValid: false };
  }

  // Check if it looks like a URL
  const isUrl = URL_PATTERNS.some(pattern => pattern.test(trimmed));

  if (isUrl) {
    // Validate URL format
    try {
      // Add protocol if missing for validation
      const urlToValidate = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      new URL(urlToValidate);
      return { type: 'url', isValid: true };
    } catch {
      return { type: 'url', isValid: false };
    }
  }

  // Treat as place name
  const components = extractPlaceComponents(trimmed);
  const hasBusinessName = components.businessName.length > 0;

  // Generate search suggestions
  const suggestions = [];
  if (hasBusinessName) {
    if (components.location) {
      suggestions.push(`${components.businessName} in ${components.location}`);
    } else {
      suggestions.push(`${components.businessName} near me`);
      suggestions.push(`${components.businessName} locations`);
    }
  }

  return {
    type: 'place_name',
    isValid: hasBusinessName,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
};

// Normalize URL by adding protocol if missing
export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (trimmed.startsWith('http')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

// Format place search query for API
export const formatPlaceQuery = (input: string): string => {
  const components = extractPlaceComponents(input);

  if (components.location) {
    return `${components.businessName} ${components.location}`;
  }

  return components.businessName;
};
