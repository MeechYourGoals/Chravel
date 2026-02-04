/**
 * SMS Message Templates
 * 
 * Short, actionable SMS messages under 160 characters with deep links.
 * Branded with [ChravelApp] prefix and relevant emoji.
 */

const APP_BASE_URL = 'https://chravel.app';

export interface SmsTemplateData {
  tripId?: string;
  tripName?: string;
  senderName?: string;
  amount?: number | string;
  currency?: string;
  location?: string;
  eventName?: string;
  eventTime?: string;
  preview?: string;
}

export type SmsCategory = 
  | 'basecamp_updates'
  | 'join_requests'
  | 'payments'
  | 'broadcasts'
  | 'calendar_events';

/**
 * Generate a deep link to a specific trip tab
 */
function tripLink(tripId: string, tab?: string): string {
  const path = tab ? `/trip/${tripId}/${tab}` : `/trip/${tripId}`;
  return `${APP_BASE_URL}${path}`;
}

/**
 * Truncate text to fit within character limit while preserving meaning
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate SMS message based on notification category
 */
export function generateSmsMessage(
  category: SmsCategory,
  data: SmsTemplateData
): string {
  const { tripId = '', tripName = 'your trip', senderName = 'Someone' } = data;
  
  switch (category) {
    case 'basecamp_updates': {
      const location = data.location ? truncate(data.location, 40) : 'a new address';
      const link = tripLink(tripId, 'places');
      return `[ChravelApp] 📍 Basecamp changed for ${truncate(tripName, 20)}: ${location}. View: ${link}`;
    }
    
    case 'join_requests': {
      const link = tripLink(tripId, 'members');
      return `[ChravelApp] 👤 ${truncate(senderName, 15)} wants to join ${truncate(tripName, 25)}. Review: ${link}`;
    }
    
    case 'payments': {
      const amount = data.amount || '0';
      const currency = data.currency || 'USD';
      const symbol = currency === 'USD' ? '$' : currency;
      const link = tripLink(tripId, 'payments');
      return `[ChravelApp] 💰 ${truncate(senderName, 12)} requested ${symbol}${amount} for ${truncate(tripName, 20)}. Pay: ${link}`;
    }
    
    case 'broadcasts': {
      const preview = data.preview ? truncate(data.preview, 60) : 'Important update';
      const link = tripLink(tripId, 'chat');
      return `[ChravelApp] 🚨 ${truncate(tripName, 15)}: ${preview} ${link}`;
    }
    
    case 'calendar_events': {
      const eventName = data.eventName ? truncate(data.eventName, 25) : 'An event';
      const timeInfo = data.eventTime ? ` at ${data.eventTime}` : ' soon';
      const link = tripLink(tripId, 'calendar');
      return `[ChravelApp] 🗓️ ${eventName}${timeInfo} in ${truncate(tripName, 15)}. Details: ${link}`;
    }
    
    default: {
      // Generic fallback
      const link = tripLink(tripId);
      return `[ChravelApp] New update in ${truncate(tripName, 30)}. View: ${link}`;
    }
  }
}

/**
 * Check if a category is SMS-eligible
 */
export function isSmsEligibleCategory(category: string): category is SmsCategory {
  return ['basecamp_updates', 'join_requests', 'payments', 'broadcasts', 'calendar_events'].includes(category);
}
