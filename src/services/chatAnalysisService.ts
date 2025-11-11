/**
 * Chat Analysis Service
 * AI-powered parsing of payment information from chat messages
 * 
 * ENHANCED FOR MVP PRODUCTION READINESS (2025-01-31)
 * - Added Gemini AI integration via lovable-concierge for intelligent parsing
 * - Enhanced pattern recognition for payment participant detection
 * - Integrated chat message context analysis
 * - Added payment_split_patterns table for ML-based suggestions
 * 
 * @module services/chatAnalysisService
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
 * System prompt for Gemini AI to parse payment information
 */
const PAYMENT_PARSER_PROMPT = `You are a payment parsing assistant. Extract payment information from user messages.

Given a message about a payment or expense, identify:
1. Payment amount and currency
2. Description of what the payment is for
3. Participants who should split the payment (based on names mentioned or context)

Return a JSON object with:
{
  "amount": number (optional),
  "currency": "USD" | "EUR" | "GBP" | "CAD" (optional, default USD),
  "description": string (optional),
  "participants": string[] (array of participant names mentioned),
  "confidence": number (0-1, how confident you are this is a payment)
}

Examples:
- "Sam owes me $50" → {"amount": 50, "currency": "USD", "participants": ["Sam"], "confidence": 0.9}
- "Dinner split between me, Sarah, and Mike" → {"participants": ["Sarah", "Mike"], "confidence": 0.85}
- "I paid $100 for the hotel room" → {"amount": 100, "currency": "USD", "description": "hotel room", "confidence": 0.7}
- "Just had lunch" → {"confidence": 0.2} (not a payment request)

Be conservative - only suggest participants if explicitly mentioned or strongly implied.`;

/**
 * Parse payment information using Gemini AI via lovable-concierge
 * 
 * @param messageText - The message to parse
 * @param tripId - Trip ID for context
 * @param profiles - Available trip member profiles
 * @param senderId - ID of the message sender
 * @returns Parsed payment information or null if parsing fails
 */
async function parseWithAI(
  messageText: string,
  tripId: string,
  profiles: Array<{ user_id: string; display_name: string | null }>,
  senderId: string
): Promise<PaymentParsingResult | null> {
  try {
    // Build context with trip member names for AI
    const memberNames = profiles
      .filter(p => p.user_id !== senderId)
      .map(p => p.display_name || 'Unknown')
      .join(', ');

    const aiPrompt = `${PAYMENT_PARSER_PROMPT}

Available trip members: ${memberNames}

Message to parse: "${messageText}"

Return ONLY valid JSON, no other text.`;

    // Call lovable-concierge edge function
    const { data, error } = await supabase.functions.invoke('lovable-concierge', {
      body: {
        message: aiPrompt,
        tripId,
        config: {
          systemPrompt: 'You are a payment parsing assistant. Return only valid JSON.',
          temperature: 0.3, // Lower temperature for more consistent parsing
        },
      },
    });

    if (error || !data) {
      console.warn('[chatAnalysisService] AI parsing failed:', error);
      return null;
    }

    // Extract JSON from response (AI might wrap it in markdown or text)
    let aiResponse = data.response || data.content || '';
    
    // Try to extract JSON from markdown code blocks
    const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                      aiResponse.match(/(\{[\s\S]*\})/);
    
    if (jsonMatch) {
      aiResponse = jsonMatch[1];
    }

    // Parse JSON response
    let parsed: {
      amount?: number;
      currency?: string;
      description?: string;
      participants?: string[];
      confidence?: number;
    };

    try {
      parsed = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('[chatAnalysisService] Failed to parse AI JSON response:', parseError);
      return null;
    }

    // Map participant names to user IDs
    const suggestedParticipants: PaymentParticipantSuggestion[] = [];
    
    if (parsed.participants && Array.isArray(parsed.participants)) {
      for (const participantName of parsed.participants) {
        const profile = profiles.find(p => {
          const displayName = (p.display_name || '').toLowerCase();
          const nameLower = participantName.toLowerCase();
          return displayName === nameLower ||
                 displayName.includes(nameLower) ||
                 nameLower.includes(displayName) ||
                 displayName.split(' ').some(part => part === nameLower);
        });

        if (profile && profile.user_id !== senderId) {
          suggestedParticipants.push({
            userId: profile.user_id,
            userName: profile.display_name || 'Unknown',
            confidence: parsed.confidence || 0.7,
            reason: `AI detected: "${participantName}"`
          });
        }
      }
    }

    return {
      amount: parsed.amount,
      currency: parsed.currency || 'USD',
      description: parsed.description,
      suggestedParticipants,
      confidence: parsed.confidence || 0.5
    };
  } catch (error) {
    console.error('[chatAnalysisService] Error in AI parsing:', error);
    return null;
  }
}

/**
 * Detect payment participants from a chat message
 * Uses AI-powered parsing (Gemini via lovable-concierge) combined with pattern matching
 * 
 * ENHANCEMENT: Now uses Gemini AI for intelligent parsing of natural language
 * Falls back to pattern matching if AI is unavailable
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

    // Step 3: Try AI-powered parsing first (Gemini via lovable-concierge)
    let aiResult: PaymentParsingResult | null = null;
    try {
      aiResult = await parseWithAI(messageText, tripId, profiles, senderId);
    } catch (aiError) {
      console.warn('[chatAnalysisService] AI parsing failed, falling back to pattern matching:', aiError);
    }

    // Step 4: Fallback to pattern matching (enhanced)
    const normalizedText = messageText.toLowerCase().trim();
    const suggestions: PaymentParticipantSuggestion[] = [];

    // Pattern 1: Enhanced direct mentions with payment context
    // Matches: "Sam owes me $50", "I paid $100 for dinner, split with @Sam and @Alex", 
    // "Split between me, Sarah, and Mike", "Dinner with John and Jane"
    const mentionPatterns = [
      /(?:split|split between|split with|owes|owe|paid for|pay)\s+(?:me\s*,\s*)?(?:and\s*)?(@?\w+(?:\s*,\s*(?:and\s*)?@?\w+)*)/gi,
      /(@?\w+)\s+(?:owes|owe|paid|split)/gi,
      /(?:with|between)\s+(@?\w+(?:\s*,\s*(?:and\s*)?@?\w+)*)/gi
    ];
    
    for (const pattern of mentionPatterns) {
      const matches = Array.from(normalizedText.matchAll(pattern));
      for (const match of matches) {
        const namesText = match[1] || match[0];
        // Extract individual names (handle "me, Sarah, and Mike" or "@Sam and @Alex")
        const names = namesText
          .split(/\s*,\s*(?:and\s*)?/)
          .map(name => name.replace(/^@/, '').trim())
          .filter(name => name && name !== 'me' && name !== 'i');
        
        for (const nameMatch of names) {
          const profile = profiles.find(p => {
            const displayName = (p.display_name || '').toLowerCase();
            const nameLower = nameMatch.toLowerCase();
            return displayName.includes(nameLower) || nameLower.includes(displayName) ||
                   displayName.split(' ').some(part => part === nameLower);
          });
          
          if (profile && profile.user_id !== senderId && 
              !suggestions.find(s => s.userId === profile.user_id)) {
            suggestions.push({
              userId: profile.user_id,
              userName: profile.display_name || 'Unknown',
              confidence: 0.8,
              reason: `Mentioned in payment context: "${nameMatch}"`
            });
          }
        }
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

    // Step 5: Merge AI results with pattern matching results
    if (aiResult && aiResult.confidence > 0.5) {
      // Use AI-detected participants if available
      aiResult.suggestedParticipants.forEach(aiSuggestion => {
        const existing = suggestions.find(s => s.userId === aiSuggestion.userId);
        if (existing) {
          // Boost confidence if AI also detected it
          existing.confidence = Math.min(1, existing.confidence + 0.15);
          existing.reason = `${existing.reason} (AI confirmed)`;
        } else {
          // Add AI suggestion with high confidence
          suggestions.push({
            ...aiSuggestion,
            confidence: aiSuggestion.confidence * 0.9 // Slightly reduce AI confidence for safety
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
        // Boost confidence if also mentioned in message or AI detected
        existing.confidence = Math.min(1, existing.confidence + 0.1);
      } else {
        // Add with lower confidence
        suggestions.push({
          ...suggestion,
          confidence: Math.max(0.3, suggestion.confidence - 0.2)
        });
      }
    });

    // Pattern 4: Extract amount and currency (use AI result if available, otherwise pattern match)
    let amount: number | undefined = aiResult?.amount;
    let currency: string | undefined = aiResult?.currency || 'USD';

    if (!amount) {
      // Enhanced amount extraction
      const amountPatterns = [
        /(?:^|\s)(\$|€|£|usd|eur|gbp|cad)?\s*(\d+(?:\.\d{2})?)/i,
        /(\d+(?:\.\d{2})?)\s*(?:dollars?|euros?|pounds?|usd|eur|gbp|cad)/i
      ];
      
      for (const pattern of amountPatterns) {
        const amountMatch = normalizedText.match(pattern);
        if (amountMatch) {
          amount = parseFloat(amountMatch[2] || amountMatch[1]);
          const currencySymbol = (amountMatch[1] || amountMatch[3] || '').toLowerCase();
          if (currencySymbol) {
            const currencyMap: Record<string, string> = {
              '$': 'USD', 'dollar': 'USD', 'dollars': 'USD',
              '€': 'EUR', 'euro': 'EUR', 'euros': 'EUR',
              '£': 'GBP', 'pound': 'GBP', 'pounds': 'GBP',
              'usd': 'USD', 'eur': 'EUR', 'gbp': 'GBP', 'cad': 'CAD'
            };
            currency = currencyMap[currencySymbol] || 'USD';
          }
          break;
        }
      }
    }

    // Pattern 5: Extract description (use AI result if available, otherwise keyword matching)
    let description: string | undefined = aiResult?.description;
    
    if (!description) {
      const descriptionKeywords = [
        'dinner', 'lunch', 'breakfast', 'food', 'meal', 'restaurant',
        'taxi', 'uber', 'lyft', 'ride', 'transport', 'car',
        'hotel', 'accommodation', 'airbnb', 'room', 'lodging',
        'tickets', 'concert', 'show', 'event', 'movie', 'theater',
        'groceries', 'shopping', 'gas', 'fuel', 'parking',
        'drinks', 'bar', 'coffee', 'snacks'
      ];
      
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
    }

    // Calculate overall confidence (boost if AI was used)
    const baseConfidence = aiResult?.confidence || 0;
    const patternConfidence = suggestions.length > 0 
      ? Math.min(1, 0.5 + (suggestions.length * 0.1) + (amount ? 0.2 : 0))
      : 0;
    
    // Use higher of AI or pattern confidence, but boost if both agree
    const confidence = aiResult && patternConfidence > 0.5
      ? Math.min(1, Math.max(baseConfidence, patternConfidence) + 0.1)
      : Math.max(baseConfidence, patternConfidence);

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
 * 
 * ENHANCEMENT: Now uses payment_split_patterns table if available, falls back to trip_payment_messages
 */
async function getHistoricalPaymentSuggestions(
  tripId: string,
  userId: string,
  availableProfiles: Array<{ user_id: string; display_name: string | null }>
): Promise<PaymentParticipantSuggestion[]> {
  try {
    // Try to use payment_split_patterns table first (ML-based patterns)
    try {
      const { data: patterns, error: patternError } = await supabase
        .from('payment_split_patterns')
        .select('participant_id, frequency, last_split_at')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .order('frequency', { ascending: false })
        .limit(10);

      if (!patternError && patterns && patterns.length > 0) {
        const suggestions: PaymentParticipantSuggestion[] = [];
        
        patterns.forEach(pattern => {
          const profile = availableProfiles.find(p => p.user_id === pattern.participant_id);
          if (profile) {
            // Calculate confidence based on frequency and recency
            const frequencyScore = Math.min(0.7, pattern.frequency / 10); // Max 0.7 from frequency
            const recencyScore = pattern.last_split_at 
              ? Math.min(0.3, (Date.now() - new Date(pattern.last_split_at).getTime()) / (30 * 24 * 60 * 60 * 1000) * 0.3)
              : 0;
            
            suggestions.push({
              userId: profile.user_id,
              userName: profile.display_name || 'Unknown',
              confidence: Math.min(0.9, 0.5 + frequencyScore - recencyScore),
              reason: `Frequently splits together (${pattern.frequency} times)`
            });
          }
        });

        return suggestions.sort((a, b) => b.confidence - a.confidence);
      }
    } catch (patternTableError) {
      // Table might not exist yet, fall through to legacy method
      console.debug('[chatAnalysisService] payment_split_patterns table not available, using legacy method');
    }

    // Fallback: Get recent payment messages where user was involved
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
 * 
 * ENHANCEMENT: Now prioritizes ML-based patterns from payment_split_patterns table
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

    // Get historical payment patterns (uses payment_split_patterns if available)
    const historicalSuggestions = await getHistoricalPaymentSuggestions(
      tripId,
      userId,
      profiles
    );

    // If we have historical data with good confidence, use it
    if (historicalSuggestions.length > 0 && historicalSuggestions[0].confidence >= 0.6) {
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

/**
 * Analyze recent chat messages for payment context
 * Scans the last N messages to detect payment-related conversations
 * and suggest participants based on chat context
 * 
 * @param tripId - Trip ID
 * @param userId - Current user ID
 * @param limit - Number of recent messages to analyze (default: 20)
 * @returns Payment parsing result from most relevant chat message, or null
 */
export async function analyzeChatMessagesForPayment(
  tripId: string,
  userId: string,
  limit: number = 20
): Promise<PaymentParsingResult | null> {
  try {
    // Fetch recent chat messages
    const { data: messages, error } = await supabase
      .from('trip_chat_messages')
      .select('id, message_content, sender_id, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !messages || messages.length === 0) {
      return null;
    }

    // Look for payment-related keywords in messages
    const paymentKeywords = [
      'owe', 'owes', 'paid', 'pay', 'split', 'splitting', 'dinner', 'lunch',
      'breakfast', 'taxi', 'uber', 'hotel', 'tickets', 'cost', 'expense',
      'bill', 'check', 'receipt', '$', '€', '£', 'dollar', 'euro', 'pound'
    ];

    // Find messages with payment context
    const paymentMessages = messages.filter(msg => {
      const content = (msg.message_content || '').toLowerCase();
      return paymentKeywords.some(keyword => content.includes(keyword));
    });

    if (paymentMessages.length === 0) {
      return null;
    }

    // Analyze the most recent payment-related message
    const mostRecentPaymentMessage = paymentMessages[0];
    const result = await detectPaymentParticipantsFromMessage(
      mostRecentPaymentMessage.message_content || '',
      tripId,
      mostRecentPaymentMessage.sender_id || userId
    );

    // Only return if we have reasonable confidence
    if (result.confidence >= 0.5 && result.suggestedParticipants.length > 0) {
      return result;
    }

    return null;
  } catch (error) {
    console.error('[chatAnalysisService] Error analyzing chat messages:', error);
    return null;
  }
}

/**
 * Record a payment split pattern for ML-based suggestions
 * Called when a payment is created to update the payment_split_patterns table
 * 
 * @param tripId - Trip ID
 * @param userId - User who created the payment
 * @param participantIds - Array of participant user IDs
 */
export async function recordPaymentSplitPattern(
  tripId: string,
  userId: string,
  participantIds: string[]
): Promise<void> {
  try {
    // Check if payment_split_patterns table exists
    const { error: checkError } = await supabase
      .from('payment_split_patterns')
      .select('id')
      .limit(1);

    if (checkError) {
      // Table doesn't exist yet, skip recording (will be created by migration)
      console.debug('[chatAnalysisService] payment_split_patterns table not available yet');
      return;
    }

    // Update or insert patterns for each participant
    for (const participantId of participantIds) {
      if (participantId === userId) continue; // Skip self

      // Check if pattern exists
      const { data: existing } = await supabase
        .from('payment_split_patterns')
        .select('id, frequency')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .eq('participant_id', participantId)
        .single();

      if (existing) {
        // Update frequency and last_split_at
        await supabase
          .from('payment_split_patterns')
          .update({
            frequency: (existing.frequency || 0) + 1,
            last_split_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new pattern
        await supabase
          .from('payment_split_patterns')
          .insert({
            trip_id: tripId,
            user_id: userId,
            participant_id: participantId,
            frequency: 1,
            last_split_at: new Date().toISOString()
          });
      }
    }
  } catch (error) {
    // Silently fail - pattern recording is optional
    console.debug('[chatAnalysisService] Error recording payment split pattern:', error);
  }
}
