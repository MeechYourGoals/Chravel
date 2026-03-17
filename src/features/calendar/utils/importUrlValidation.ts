export interface ImportUrlValidationResult {
  normalizedUrl: string;
  isValid: boolean;
  error: string | null;
}

export function validateImportUrl(input: string): ImportUrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { normalizedUrl: '', isValid: false, error: null };
  }

  if (/^[a-z]+:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return {
      normalizedUrl: trimmed,
      isValid: false,
      error: 'Use an http:// or https:// URL.',
    };
  }

  const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(normalizedUrl);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    if (!isHttp) {
      return {
        normalizedUrl,
        isValid: false,
        error: 'Use an http:// or https:// URL.',
      };
    }

    if (!parsed.hostname) {
      return {
        normalizedUrl,
        isValid: false,
        error: 'Enter a valid website URL.',
      };
    }

    return { normalizedUrl, isValid: true, error: null };
  } catch {
    return {
      normalizedUrl,
      isValid: false,
      error: 'Enter a valid website URL.',
    };
  }
}
