// Input validation and sanitization utilities
export class InputValidator {
  // Sanitize string input to prevent XSS
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  // Validate and sanitize search queries
  static sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') return '';
    
    return query
      .replace(/[<>'"]/g, '')
      .replace(/[;(){}[\]]/g, '') // Remove SQL injection characters
      .trim()
      .substring(0, 200);
  }

  // Validate URL format
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Sanitize HTML content for display
  static sanitizeHtml(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  // Validate trip ID format
  static isValidTripId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 50;
  }

  // Rate limiting check (simple client-side implementation)
  private static requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  
  static checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.requestCounts.get(identifier);
    
    if (!existing || now > existing.resetTime) {
      this.requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (existing.count >= maxRequests) {
      return false;
    }
    
    existing.count++;
    return true;
  }
}

// Content Security Policy helper
export class CSPHelper {
  static createSecureStyleElement(css: string): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = css;
    return style;
  }
  
  static sanitizeInlineStyles(styles: Record<string, string>): Record<string, string> {
    const safe: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(styles)) {
      // Only allow safe CSS properties
      if (this.isSafeCSSProperty(key) && this.isSafeCSSValue(value)) {
        safe[key] = value;
      }
    }
    
    return safe;
  }
  
  private static isSafeCSSProperty(property: string): boolean {
    const safeProperties = [
      'color', 'background-color', 'font-size', 'font-weight', 'margin', 'padding',
      'border', 'width', 'height', 'display', 'position', 'top', 'left', 'right', 'bottom'
    ];
    return safeProperties.includes(property);
  }
  
  private static isSafeCSSValue(value: string): boolean {
    // Block javascript and data URLs
    return !value.toLowerCase().includes('javascript:') && 
           !value.toLowerCase().includes('data:') &&
           !value.includes('<') &&
           !value.includes('>');
  }
}

/**
 * Secure Storage Access Helper
 * Provides utilities for accessing secure_storage with proper authentication verification
 */
export class SecureStorageHelper {
  /**
   * Creates a verification session after successful authentication
   * This must be called before accessing secure_storage to grant access for a limited time
   * 
   * @param supabaseClient - Supabase client instance
   * @param verificationMethod - Method used for verification ('password', 'mfa', 'biometric')
   * @param sessionDurationMinutes - Duration of the verification session (default: 15, max: 60)
   * @returns Promise with session details or error
   */
  static async createVerificationSession(
    supabaseClient: any,
    verificationMethod: 'password' | 'mfa' | 'biometric' = 'password',
    sessionDurationMinutes: number = 15
  ): Promise<{ success: boolean; sessionId?: string; expiresAt?: string; error?: string }> {
    try {
      const { data, error } = await supabaseClient.functions.invoke('verify-identity', {
        body: {
          verification_method: verificationMethod,
          session_duration_minutes: sessionDurationMinutes,
        },
      });

      if (error) {
        console.error('Failed to create verification session:', error);
        return { success: false, error: error.message || 'Failed to create verification session' };
      }

      return {
        success: true,
        sessionId: data.session_id,
        expiresAt: data.expires_at,
      };
    } catch (err) {
      console.error('Error creating verification session:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' };
    }
  }

  /**
   * Attempts to access secure_storage with automatic verification session creation if needed
   * If access fails due to missing recent authentication, prompts for re-authentication
   * 
   * @param supabaseClient - Supabase client instance
   * @param operation - Function that performs the secure_storage operation
   * @param onReauthRequired - Callback to handle re-authentication requirement
   * @returns Promise with operation result or error
   */
  static async withSecureStorageAccess<T>(
    supabaseClient: any,
    operation: () => Promise<T>,
    onReauthRequired?: () => Promise<void>
  ): Promise<{ success: boolean; data?: T; error?: string; requiresReauth?: boolean }> {
    try {
      // Attempt the operation first
      const result = await operation();
      return { success: true, data: result };
    } catch (err) {
      // Check if error is due to missing recent authentication
      const errorMessage = err instanceof Error ? err.message : '';
      const isAuthError = 
        errorMessage.includes('permission denied') ||
        errorMessage.includes('row-level security') ||
        errorMessage.includes('policy violation');

      if (isAuthError && onReauthRequired) {
        // Attempt to create verification session and retry
        const sessionResult = await this.createVerificationSession(supabaseClient, 'password');
        
        if (sessionResult.success) {
          try {
            const retryResult = await operation();
            return { success: true, data: retryResult };
          } catch (retryErr) {
            // Still failing after verification session - require explicit re-auth
            await onReauthRequired();
            return { 
              success: false, 
              error: 'Access denied. Please re-authenticate.', 
              requiresReauth: true 
            };
          }
        } else {
          // Failed to create verification session - require explicit re-auth
          await onReauthRequired();
          return { 
            success: false, 
            error: 'Access denied. Please re-authenticate.', 
            requiresReauth: true 
          };
        }
      }

      return { success: false, error: err.message || 'Operation failed' };
    }
  }
}