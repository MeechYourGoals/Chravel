export type PrivacyMode = 'standard' | 'high';

export interface PrivacySettings {
  privacy_mode: PrivacyMode;
  ai_access_enabled: boolean;
  encryption_level: 'server' | 'e2ee';
  created_at: string;
  updated_at: string;
}

export interface TripPrivacyConfig {
  trip_id: string;
  privacy_mode: PrivacyMode;
  ai_access_enabled: boolean;
  can_change_privacy: boolean;
  created_by: string;
  participants_notified: boolean;
}

export interface EncryptionKeyData {
  trip_id: string;
  key_id: string;
  public_key: string;
  created_at: string;
  expires_at?: string;
}

export interface PrivacyModeInfo {
  mode: PrivacyMode;
  label: string;
  icon: string;
  description: string;
  features: {
    ai_concierge: boolean;
    smart_suggestions: boolean;
    message_encryption: 'server' | 'e2ee';
    data_access: 'full' | 'limited' | 'none';
  };
  compliance: string[];
}

export const PRIVACY_MODE_CONFIG: Record<PrivacyMode, PrivacyModeInfo> = {
  standard: {
    mode: 'standard',
    label: 'Standard Privacy',
    icon: '🤖',
    description: 'AI-powered features with server-side encryption',
    features: {
      ai_concierge: true,
      smart_suggestions: true,
      message_encryption: 'server',
      data_access: 'full'
    },
    compliance: ['SOC 2', 'GDPR Basic']
  },
  high: {
    mode: 'high',
    label: 'High Privacy',
    icon: '🔒',
    description: 'End-to-end encryption with optional AI concierge access',
    features: {
      ai_concierge: true,
      smart_suggestions: true,
      message_encryption: 'e2ee',
      data_access: 'limited'
    },
    compliance: ['SOC 2', 'GDPR Enhanced', 'HIPAA Ready', 'Enterprise Grade']
  }
};

export const getDefaultPrivacyMode = (tripType: 'consumer' | 'pro' | 'event'): PrivacyMode => {
  switch (tripType) {
    case 'consumer':
      return 'standard';
    case 'pro':
    case 'event':
      return 'high';
    default:
      return 'standard';
  }
};

export const getPrivacyModeInfo = (mode: PrivacyMode): PrivacyModeInfo => {
  return PRIVACY_MODE_CONFIG[mode];
};