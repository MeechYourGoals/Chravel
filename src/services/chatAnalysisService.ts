/**
 * Chat Analysis Service
 * AI-powered parsing of payment information from chat messages
 */

import { supabase } from '../integrations/supabase/client';

export interface PaymentParticipantSuggestion {
  userId: string;
  userName: string;
  confidence: number; // 0-1
  reason: string; // Why this participant was suggested
}

export interface PaymentParsingResult {
  amount?: number;
  currency?: string;
  description?: string;
  suggestedParticipants: PaymentParticipantSuggestion[];
  confidence: number; // Overall confidence in parsing
}

/**
 * Detect payment participants from a chat message
 * Uses pattern matching and AI context to suggest who should split a payment
 */
export async function detectPaymentParticipantsFromMessage(
  messageText: string,
  tripId: string,
  senderId: string
): Promise<PaymentParsingResult> {
  try {
    // Step 1: Fetch trip members
    const { data: memberIds, error: memberError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId);

    if (memberError || !memberIds || memberIds.length === 0) {
      return {
        suggestedParticipants: [],
        confidence: 0
      };
    }

    const userIds = memberIds.map(m => m.user_id);

    // Step 2: Get profiles for all trip members
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    if (profileError || !profiles) {
      return {
        suggestedParticipants: [],
        confidence: 0
      };
    }

    // Step 3: Parse message for payment information
    const normalizedText = messageText.toLowerCase().trim();
    const suggestions: PaymentParticipantSuggestion[] = [];

    // Pattern 1: Direct mentions with payment context
    // "Sam owes me $50" or "I paid $100 for dinner, split with @Sam and @Alex"
    const mentionPattern = /@?(\w+)\s+(?:owes|paid|split|owe)/gi;
    const mentions = Array.from(normalizedText.matchAll(mentionPattern));
    
    for (const mention of mentions) {
      const nameMatch = mention[1];
      const profile = profiles.find(p => 
        p.display_name?.toLowerCase().includes(nameMatch.toLowerCase()) ||
        nameMatch.toLowerCase().includes(p.display_name?.toLowerCase() || '')
      );
      
      if (profile && profile.user_id !== senderId) {
        suggestions.push({
          userId: profile.user_id,
          userName: profile.display_name || 'Unknown',
          confidence: 0.8,
          reason: `Mentioned in payment context: "${mention[0]}"`
        });
      }
    }

    // Pattern 2: "we" or "us" suggests all participants
    if (/\b(we|us|everyone|all)\b/i.test(normalizedText)) {
      profiles.forEach(profile => {
        if (profile.user_id !== senderId && 
            !suggestions.find(s => s.userId === profile.user_id)) {
          suggestions.push({
            userId: profile.user_id,
            userName: profile.display_name || 'Unknown',
            confidence: 0.7,
            reason: 'Included in group reference ("we", "us", "everyone")'
          });
        }
      });
    }

    // Pattern 3: Check historical payment patterns
    // If user frequently splits with certain people, suggest them
    const historicalSuggestions = await getHistoricalPaymentSuggestions(
      tripId,
      senderId,
      profiles.filter(p => p.user_id !== senderId)
    );
    
    // Merge historical suggestions (lower confidence but still useful)
    historicalSuggestions.forEach(suggestion => {
      const existing = suggestions.find(s => s.userId === suggestion.userId);
      if (existing) {
        // Boost confidence if also mentioned in message
        existing.confidence = Math.min(1, existing.confidence + 0.1);
      } else {
        // Add with lower confidence
        suggestions.push({
          ...suggestion,
          confidence: Math.max(0.3, suggestion.confidence - 0.2)
        });
      }
    });

    // Pattern 4: Extract amount and currency
    const amountMatch = normalizedText.match(/(?:^|\s)(\$|€|£|usd|eur|gbp|cad)?\s*(\d+(?:\.\d{2})?)/i);
    let amount: number | undefined;
    let currency: string | undefined = 'USD';

    if (amountMatch) {
      amount = parseFloat(amountMatch[2]);
      const currencySymbol = amountMatch[1]?.toLowerCase();
      if (currencySymbol) {
        const currencyMap: Record<string, string> = {
          '$': 'USD',
          '€': 'EUR',
          '£': 'GBP',
          'usd': 'USD',
          'eur': 'EUR',
          'gbp': 'GBP',
          'cad': 'CAD'
        };
        currency = currencyMap[currencySymbol] || 'USD';
      }
    }

    // Pattern 5: Extract description (common payment keywords)
    const descriptionKeywords = [
      'dinner', 'lunch', 'breakfast', 'food',
      'taxi', 'uber', 'lyft', 'ride',
      'hotel', 'accommodation', 'airbnb',
      'tickets', 'concert', 'show', 'event',
      'groceries', 'shopping', 'gas', 'fuel'
    ];
    
    let description: string | undefined;
    for (const keyword of descriptionKeywords) {
      if (normalizedText.includes(keyword)) {
        // Extract surrounding context
        const keywordIndex = normalizedText.indexOf(keyword);
        const start = Math.max(0, keywordIndex - 20);
        const end = Math.min(normalizedText.length, keywordIndex + keyword.length + 20);
        description = messageText.substring(start, end).trim();
        break;
      }
    }

    // Calculate overall confidence
    const confidence = suggestions.length > 0 
      ? Math.min(1, 0.5 + (suggestions.length * 0.1) + (amount ? 0.2 : 0))
      : 0;

    return {
      amount,
      currency,
      description,
      suggestedParticipants: suggestions.slice(0, 10), // Limit to top 10
      confidence
    };
  } catch (error) {
    console.error('Error detecting payment participants:', error);
    return {
      suggestedParticipants: [],
      confidence: 0
    };
  }
}

/**
 * Get payment suggestions based on historical payment patterns
 * Suggests people who frequently split payments together
 */
async function getHistoricalPaymentSuggestions(
  tripId: string,
  userId: string,
  availableProfiles: Array<{ user_id: string; display_name: string | null }>
): Promise<PaymentParticipantSuggestion[]> {
  try {
    // Get recent payment messages where user was involved
    const { data: recentPayments, error } = await supabase
      .from('trip_payment_messages')
      .select('id, split_participants')
      .eq('trip_id', tripId)
      .or(`created_by.eq.${userId},split_participants.cs.{${userId}}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !recentPayments) {
      return [];
    }

    // Count how often each person splits with the user
    const splitCounts = new Map<string, number>();
    
    recentPayments.forEach(payment => {
      const participants = Array.isArray(payment.split_participants) 
        ? payment.split_participants as string[]
        : [];
      
      participants.forEach(participantId => {
        if (participantId !== userId) {
          splitCounts.set(participantId, (splitCounts.get(participantId) || 0) + 1);
        }
      });
    });

    // Convert to suggestions
    const suggestions: PaymentParticipantSuggestion[] = [];
    availableProfiles.forEach(profile => {
      const count = splitCounts.get(profile.user_id) || 0;
      if (count > 0) {
        suggestions.push({
          userId: profile.user_id,
          userName: profile.display_name || 'Unknown',
          confidence: Math.min(0.9, 0.5 + (count * 0.1)),
          reason: `Frequently splits payments together (${count} recent payments)`
        });
      }
    });

    // Sort by confidence (frequency)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('Error getting historical payment suggestions:', error);
    return [];
  }
}

/**
 * Get automatic participant suggestions for a new payment
 * Combines trip member context with historical patterns
 */
export async function getAutomaticParticipantSuggestions(
  tripId: string,
  userId: string,
  excludeSelf: boolean = true
): Promise<PaymentParticipantSuggestion[]> {
  try {
    // Get trip members
    const { data: memberIds, error: memberError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId);

    if (memberError || !memberIds || memberIds.length === 0) {
      return [];
    }

    const userIds = memberIds
      .map(m => m.user_id)
      .filter(id => !excludeSelf || id !== userId);

    // Get profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    if (profileError || !profiles) {
      return [];
    }

    // Get historical payment patterns
    const historicalSuggestions = await getHistoricalPaymentSuggestions(
      tripId,
      userId,
      profiles
    );

    // If we have historical data, use it
    if (historicalSuggestions.length > 0) {
      return historicalSuggestions;
    }

    // Otherwise, suggest all trip members (lower confidence)
    return profiles.map(profile => ({
      userId: profile.user_id,
      userName: profile.display_name || 'Unknown',
      confidence: 0.5,
      reason: 'Trip member'
    }));
  } catch (error) {
    console.error('Error getting automatic participant suggestions:', error);
    return [];
  }
}
