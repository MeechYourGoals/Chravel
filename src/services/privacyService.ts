import { PrivacyMode, TripPrivacyConfig } from '../types/privacy';

export class PrivacyService {
  private static instance: PrivacyService;
  private keyCache: Map<string, CryptoKey> = new Map();

  private constructor() {}

  static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  // Generate encryption key for E2EE trips
  async generateTripKey(tripId: string): Promise<CryptoKey> {
    if (this.keyCache.has(tripId)) {
      return this.keyCache.get(tripId)!;
    }

    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(tripId, key);
    return key;
  }

  // Encrypt message content for high privacy trips
  async encryptMessage(content: string, tripId: string): Promise<string> {
    try {
      const key = await this.generateTripKey(tripId);
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt message content for high privacy trips
  async decryptMessage(encryptedContent: string, tripId: string): Promise<string> {
    try {
      const key = await this.generateTripKey(tripId);
      const combined = new Uint8Array(
        atob(encryptedContent).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Check if trip allows AI access to messages
  canAIAccessMessages(privacyConfig: TripPrivacyConfig): boolean {
    return privacyConfig.ai_access_enabled;
  }

  // Prepare message for sending based on privacy mode
  async prepareMessageForSending(
    content: string,
    tripId: string,
    privacyMode: PrivacyMode
  ): Promise<{ content: string; encrypted: boolean }> {
    if (privacyMode === 'high') {
      const encryptedContent = await this.encryptMessage(content, tripId);
      return { content: encryptedContent, encrypted: true };
    }
    
    return { content, encrypted: false };
  }

  // Prepare message for display based on privacy mode
  async prepareMessageForDisplay(
    content: string,
    tripId: string,
    isEncrypted: boolean
  ): Promise<string> {
    if (isEncrypted) {
      return await this.decryptMessage(content, tripId);
    }
    
    return content;
  }

  // Generate privacy disclaimer text
  getPrivacyDisclaimer(privacyMode: PrivacyMode): string {
    switch (privacyMode) {
      case 'standard':
        return 'Messages are server-encrypted and may be processed by AI for enhanced features.';
      case 'high':
        return 'Messages are end-to-end encrypted. AI access follows trip privacy settings.';
      default:
        return '';
    }
  }

  // Validate privacy mode change
  canChangePrivacyMode(
    currentMode: PrivacyMode,
    newMode: PrivacyMode,
    userRole: string
  ): { allowed: boolean; reason?: string } {
    // Only trip organizers/admins can change privacy mode
    if (!['admin', 'organizer', 'owner'].includes(userRole)) {
      return { allowed: false, reason: 'Only trip organizers can change privacy settings' };
    }

    // Warn about data implications when switching from high to standard
    if (currentMode === 'high' && newMode === 'standard') {
      return { 
        allowed: true, 
        reason:
          'Switching to Standard Privacy enables server-side encryption for new messages. Past encrypted messages remain encrypted.'
      };
    }

    return { allowed: true };
  }

  // Clear cached keys (for security)
  clearKeyCache(tripId?: string): void {
    if (tripId) {
      this.keyCache.delete(tripId);
    } else {
      this.keyCache.clear();
    }
  }
}

export const privacyService = PrivacyService.getInstance();