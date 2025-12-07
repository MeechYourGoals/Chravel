/**
 * Chat Content Parser Service
 * 
 * Automatically parses shared content in chat to extract:
 * - Receipt OCR: Extract text and structured data from receipt images
 * - Itinerary Parsing: Extract calendar events from travel documents (PDFs, images)
 * - Link Unfurling: Fetch rich previews for URLs (already exists, integrated here)
 * - Natural Language Processing: Extract entities (dates, times, locations) from messages
 * 
 * This service integrates with the enhanced-ai-parser edge function and provides
 * a unified interface for content parsing in the chat flow.
 * 
 * @module services/chatContentParser
 */

import { supabase } from '@/integrations/supabase/client';
import { calendarService, CreateEventData } from './calendarService';
import { fetchOGMetadata } from './ogMetadataService';
import { insertLinkIndex } from './linkService';

export interface ParsedReceipt {
  extracted_text: string;
  structured_data: {
    amounts?: Array<{ value: number; currency: string; description: string }>;
    dates?: string[];
    locations?: string[];
    confirmation_codes?: string[];
    vendors?: string[];
    payment_method?: string;
    total_cost?: number;
  };
  ocr_confidence: number;
  document_type: 'receipt' | 'invoice' | 'booking' | 'other';
}

export interface ParsedItinerary {
  events: Array<{
    title: string;
    date: string; // YYYY-MM-DD
    start_time?: string; // HH:MM
    end_time?: string; // HH:MM
    location?: string;
    category: 'dining' | 'lodging' | 'activity' | 'transportation' | 'entertainment' | 'business';
    confirmation_number?: string;
    confidence: number;
    source_text: string;
    all_day?: boolean;
  }>;
  confidence_overall: number;
}

export interface ParsedTodo {
  title: string;
  description?: string;
  category: 'booking' | 'packing' | 'documentation' | 'preparation' | 'logistics';
  priority: 'high' | 'medium' | 'low';
  due_date?: string; // YYYY-MM-DD
  estimated_duration?: number; // minutes
  confidence: number;
}

export interface ExtractedEntities {
  dates?: Array<{ value: string; confidence: number }>;
  times?: Array<{ value: string; confidence: number }>;
  locations?: Array<{ value: string; confidence: number }>;
  people?: Array<{ value: string; confidence: number }>;
  suggested_events?: Array<{
    title: string;
    date: string;
    time?: string;
    location?: string;
    confidence: number;
  }>;
}

export interface ParsedContent {
  type: 'receipt' | 'itinerary' | 'link' | 'message' | 'todo';
  receipt?: ParsedReceipt;
  itinerary?: ParsedItinerary;
  todos?: ParsedTodo[];
  entities?: ExtractedEntities;
  linkPreview?: {
    title?: string;
    description?: string;
    image?: string;
    domain?: string;
  };
  confidence: number;
  suggestions?: Array<{
    action: 'create_calendar_event' | 'create_todo' | 'extract_receipt' | 'none';
    data?: any;
    message: string;
  }>;
}

/**
 * Parse receipt image using OCR
 * 
 * @param imageUrl - URL of the receipt image
 * @param tripId - Trip ID for context
 * @returns Parsed receipt data
 */
export async function parseReceipt(
  imageUrl: string,
  tripId: string
): Promise<ParsedContent> {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        fileUrl: imageUrl,
        fileType: 'image/jpeg',
        extractionType: 'document_parse',
        tripId,
      },
    });

    if (error) {
      throw new Error(`Failed to parse receipt: ${error.message}`);
    }

    const parsedData = data?.parsed_data;
    if (!parsedData) {
      throw new Error('No parsed data returned from parser');
    }

    // Detect if this is a receipt based on document type and structured data
    const isReceipt = 
      parsedData.document_type === 'receipt' ||
      parsedData.document_type === 'invoice' ||
      (parsedData.structured_data?.amounts && parsedData.structured_data.amounts.length > 0);

    const receipt: ParsedReceipt = {
      extracted_text: parsedData.extracted_text || '',
      structured_data: parsedData.structured_data || {},
      ocr_confidence: parsedData.ocr_confidence || 0.8,
      document_type: isReceipt ? 'receipt' : parsedData.document_type || 'other',
    };

    // Generate suggestions
    const suggestions: ParsedContent['suggestions'] = [];
    
    if (receipt.structured_data.total_cost) {
      suggestions.push({
        action: 'extract_receipt',
        data: receipt,
        message: `Extract receipt for $${receipt.structured_data.total_cost}`,
      });
    }

    if (receipt.structured_data.dates && receipt.structured_data.dates.length > 0) {
      suggestions.push({
        action: 'create_calendar_event',
        data: {
          title: `Receipt: ${receipt.structured_data.vendors?.[0] || 'Purchase'}`,
          date: receipt.structured_data.dates[0],
          location: receipt.structured_data.locations?.[0],
        },
        message: `Add calendar event for this receipt`,
      });
    }

    return {
      type: 'receipt',
      receipt,
      confidence: receipt.ocr_confidence,
      suggestions,
    };
  } catch (error) {
    console.error('[chatContentParser] Error parsing receipt:', error);
    throw error;
  }
}

/**
 * Parse itinerary document (PDF or image) to extract calendar events
 * 
 * @param fileUrl - URL of the itinerary file
 * @param fileType - MIME type of the file
 * @param messageText - Optional message text for context
 * @param tripId - Trip ID
 * @returns Parsed itinerary with calendar events
 */
export async function parseItinerary(
  fileUrl: string,
  fileType: string,
  messageText: string,
  tripId: string
): Promise<ParsedContent> {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        fileUrl,
        fileType,
        messageText,
        extractionType: 'calendar',
        tripId,
      },
    });

    if (error) {
      throw new Error(`Failed to parse itinerary: ${error.message}`);
    }

    const extractedData = data?.extracted_data;
    if (!extractedData || !extractedData.events) {
      throw new Error('No events extracted from itinerary');
    }

    const itinerary: ParsedItinerary = {
      events: extractedData.events || [],
      confidence_overall: extractedData.confidence_overall || 0.8,
    };

    // Generate suggestions for each event
    const suggestions: ParsedContent['suggestions'] = itinerary.events.map((event) => ({
      action: 'create_calendar_event',
      data: {
        title: event.title,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        category: event.category,
        confirmation_number: event.confirmation_number,
      },
      message: `Add "${event.title}" to calendar`,
    }));

    return {
      type: 'itinerary',
      itinerary,
      confidence: itinerary.confidence_overall,
      suggestions,
    };
  } catch (error) {
    console.error('[chatContentParser] Error parsing itinerary:', error);
    throw error;
  }
}

/**
 * Parse URL and fetch rich preview
 * 
 * @param url - URL to parse
 * @param tripId - Trip ID
 * @param messageId - Optional message ID
 * @returns Parsed link content with preview
 */
export async function parseLink(
  url: string,
  tripId: string,
  messageId?: string
): Promise<ParsedContent> {
  try {
    // Fetch OG metadata
    const ogMetadata = await fetchOGMetadata(url);

    // Store in link index
    await insertLinkIndex({
      tripId,
      url,
      ogTitle: ogMetadata.title,
      ogImage: ogMetadata.image,
      ogDescription: ogMetadata.description,
      domain: ogMetadata.siteName || new URL(url).hostname,
      messageId,
    });

    const linkPreview = {
      title: ogMetadata.title,
      description: ogMetadata.description,
      image: ogMetadata.image,
      domain: ogMetadata.siteName || new URL(url).hostname,
    };

    return {
      type: 'link',
      linkPreview,
      confidence: ogMetadata.error ? 0.5 : 0.9,
    };
  } catch (error) {
    console.error('[chatContentParser] Error parsing link:', error);
    return {
      type: 'link',
      linkPreview: {
        domain: new URL(url).hostname,
      },
      confidence: 0.3,
    };
  }
}

/**
 * Extract entities and intents from natural language message
 * 
 * @param messageText - Message text to analyze
 * @param tripId - Trip ID for context
 * @returns Extracted entities and suggested actions
 */
export async function parseMessage(
  messageText: string,
  tripId: string
): Promise<ParsedContent> {
  try {
    // Use enhanced-ai-parser for entity extraction
    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        messageText,
        extractionType: 'calendar',
        tripId,
      },
    });

    if (error) {
      throw new Error(`Failed to parse message: ${error.message}`);
    }

    const extractedData = data?.extracted_data;
    const entities: ExtractedEntities = {
      dates: extractedData?.events?.map((e: any) => ({
        value: e.date,
        confidence: e.confidence || 0.8,
      })),
      times: extractedData?.events?.map((e: any) => ({
        value: e.start_time || '',
        confidence: e.confidence || 0.8,
      })),
      locations: extractedData?.events?.map((e: any) => ({
        value: e.location || '',
        confidence: e.confidence || 0.8,
      })),
      suggested_events: extractedData?.events?.map((e: any) => ({
        title: e.title,
        date: e.date,
        time: e.start_time,
        location: e.location,
        confidence: e.confidence || 0.8,
      })),
    };

    // Generate suggestions based on extracted entities
    const suggestions: ParsedContent['suggestions'] = [];
    
    if (entities.suggested_events && entities.suggested_events.length > 0) {
      entities.suggested_events.forEach((event) => {
        if (event.confidence > 0.7) {
          suggestions.push({
            action: 'create_calendar_event',
            data: {
              title: event.title,
              date: event.date,
              start_time: event.time,
              location: event.location,
            },
            message: `Add "${event.title}" to calendar`,
          });
        }
      });
    }

    // Also check for todo items
    const { data: todoData } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        messageText,
        extractionType: 'todo',
        tripId,
      },
    });

    const todos: ParsedTodo[] = todoData?.todos || [];

    if (todos.length > 0) {
      todos.forEach((todo) => {
        if (todo.confidence > 0.7) {
          suggestions.push({
            action: 'create_todo',
            data: todo,
            message: `Create todo: "${todo.title}"`,
          });
        }
      });
    }

    return {
      type: 'message',
      entities,
      todos: todos.length > 0 ? todos : undefined,
      confidence: extractedData?.confidence_overall || 0.7,
      suggestions,
    };
  } catch (error) {
    console.error('[chatContentParser] Error parsing message:', error);
    return {
      type: 'message',
      confidence: 0.3,
    };
  }
}

/**
 * Auto-detect content type and parse accordingly
 * 
 * @param content - Content to parse (file URL, message text, or URL)
 * @param contentType - Type of content: 'image' | 'document' | 'url' | 'message'
 * @param fileType - MIME type (for files)
 * @param tripId - Trip ID
 * @param messageId - Optional message ID
 * @returns Parsed content with suggestions
 */
export async function autoParseContent(
  content: string,
  contentType: 'image' | 'document' | 'url' | 'message',
  fileType: string,
  tripId: string,
  messageId?: string
): Promise<ParsedContent | null> {
  try {
    switch (contentType) {
      case 'image':
        // Check if it's likely a receipt or itinerary
        return await parseReceipt(content, tripId);
      
      case 'document':
        // Parse as itinerary
        return await parseItinerary(content, fileType, '', tripId);
      
      case 'url':
        return await parseLink(content, tripId, messageId);
      
      case 'message':
        return await parseMessage(content, tripId);
      
      default:
        return null;
    }
  } catch (error) {
    console.error('[chatContentParser] Error in autoParseContent:', error);
    return null;
  }
}

/**
 * Apply parsed content suggestions (create calendar events, todos, etc.)
 * 
 * @param suggestion - Suggestion to apply
 * @param tripId - Trip ID
 * @returns Created entity ID or null
 */
export async function applySuggestion(
  suggestion: ParsedContent['suggestions'][0],
  tripId: string
): Promise<string | null> {
  try {
    switch (suggestion.action) {
      case 'create_calendar_event': {
        if (!suggestion.data) return null;
        
        const eventData: CreateEventData = {
          trip_id: tripId,
          title: suggestion.data.title,
          start_time: suggestion.data.date
            ? new Date(`${suggestion.data.date}T${suggestion.data.start_time || '12:00'}`).toISOString()
            : new Date().toISOString(),
          end_time: suggestion.data.end_time
            ? new Date(`${suggestion.data.date}T${suggestion.data.end_time}`).toISOString()
            : undefined,
          location: suggestion.data.location,
          event_category: suggestion.data.category || 'other',
          source_type: 'ai_parsed',
          source_data: suggestion.data,
        };

        const result = await calendarService.createEvent(eventData);
        return result.event?.id || null;
      }
      
      case 'create_todo':
        // TODO: Implement todo creation service
        return null;
      
      case 'extract_receipt':
        // TODO: Implement receipt extraction/storage
        return null;
      
      default:
        return null;
    }
  } catch (error) {
    console.error('[chatContentParser] Error applying suggestion:', error);
    return null;
  }
}
