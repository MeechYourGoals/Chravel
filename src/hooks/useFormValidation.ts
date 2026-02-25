import { useState } from 'react';
import { InputValidator } from '@/utils/securityUtils';
import { toast } from 'sonner';

interface ValidationRules {
  required?: boolean;
  email?: boolean;
  url?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean | string;
}

interface FieldValidation {
  [fieldName: string]: ValidationRules;
}

interface ValidationErrors {
  [fieldName: string]: string;
}

export const useFormValidation = (validationRules: FieldValidation) => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = (fieldName: string, value: string): string | null => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // Required check
    if (rules.required && !value.trim()) {
      return `${fieldName} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value.trim() && !rules.required) {
      return null;
    }

    // Email validation
    if (rules.email && !InputValidator.isValidEmail(value)) {
      return 'Invalid email address';
    }

    // URL validation
    if (rules.url && !InputValidator.isValidUrl(value)) {
      return 'Invalid URL format';
    }

    // Length validations
    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return 'Validation failed';
      }
    }

    return null;
  };

  const validateForm = (formData: Record<string, string>): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const value = formData[fieldName] || '';
      const error = validateField(fieldName, value);

      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const sanitizeFormData = (formData: Record<string, string>): Record<string, string> => {
    const sanitized: Record<string, string> = {};

    Object.entries(formData).forEach(([key, value]) => {
      const rules = validationRules[key];

      if (rules?.url) {
        // Don't sanitize URLs, just validate them
        sanitized[key] = value;
      } else if (rules?.email) {
        // Don't sanitize emails, just validate them
        sanitized[key] = value.trim();
      } else {
        // Sanitize text inputs
        sanitized[key] = InputValidator.sanitizeText(value);
      }
    });

    return sanitized;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const checkRateLimit = (userId: string, maxRequests = 50, windowMs = 60000): boolean => {
    const allowed = InputValidator.checkRateLimit(userId, maxRequests, windowMs);

    if (!allowed) {
      toast.error('Too many requests. Please slow down and try again in a minute.');
    }

    return allowed;
  };

  return {
    errors,
    validateField,
    validateForm,
    sanitizeFormData,
    clearErrors,
    clearFieldError,
    checkRateLimit,
  };
};
