import { useState, useCallback } from 'react';

export interface BroadcastFormData {
  message: string;
  location: string;
  category: 'chill' | 'logistics' | 'urgent';
  recipient: string;
  translateTo: string;
}

export interface CreateBroadcastData {
  message: string;
  location?: string;
  category: 'chill' | 'logistics' | 'urgent';
  recipients: string;
  translateTo?: string;
}

export const useBroadcastComposer = () => {
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'chill' | 'logistics' | 'urgent'>('chill');
  const [recipient, setRecipient] = useState('everyone');
  const [translateTo, setTranslateTo] = useState<string>('none');
  const [showDetails, setShowDetails] = useState(false);

  const validateBroadcast = useCallback((): { isValid: boolean; error?: string } => {
    if (!message.trim()) {
      return { isValid: false, error: 'Message is required' };
    }

    if (message.length > 140) {
      return { isValid: false, error: 'Message must be 140 characters or less' };
    }

    return { isValid: true };
  }, [message]);

  const getBroadcastData = useCallback((): CreateBroadcastData | null => {
    const validation = validateBroadcast();
    if (!validation.isValid) {
      return null;
    }

    return {
      message: message.trim(),
      location: location.trim() || undefined,
      category,
      recipients: recipient,
      translateTo: translateTo !== 'none' ? translateTo : undefined
    };
  }, [message, location, category, recipient, translateTo, validateBroadcast]);

  const resetForm = useCallback(() => {
    setMessage('');
    setLocation('');
    setCategory('chill');
    setRecipient('everyone');
    setTranslateTo('none');
    setShowDetails(false);
  }, []);

  const getCategoryColor = useCallback((cat: string) => {
    switch (cat) {
      case 'chill': return 'bg-blue-600';
      case 'logistics': return 'bg-yellow-600';
      case 'urgent': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  }, []);

  return {
    // State
    message,
    location,
    category,
    recipient,
    translateTo,
    showDetails,
    
    // Computed
    isValid: validateBroadcast().isValid,
    characterCount: message.length,
    maxCharacters: 140,
    
    // Actions
    setMessage,
    setLocation,
    setCategory,
    setRecipient,
    setTranslateTo,
    setShowDetails,
    validateBroadcast,
    getBroadcastData,
    resetForm,
    getCategoryColor
  };
};
