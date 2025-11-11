/**
 * Parsed Content Suggestions Component
 * 
 * Displays suggestions from parsed chat content (receipts, itineraries, messages)
 * Allows users to quickly apply suggestions (create calendar events, todos, etc.)
 * 
 * @module components/chat/ParsedContentSuggestions
 */

import React from 'react';
import { Calendar, CheckSquare, Receipt, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedContent, applySuggestion } from '@/services/chatContentParser';
import { toast } from 'sonner';

interface ParsedContentSuggestionsProps {
  parsedContent: ParsedContent | null;
  tripId: string;
  onSuggestionApplied?: () => void;
  onDismiss?: () => void;
}

export const ParsedContentSuggestions: React.FC<ParsedContentSuggestionsProps> = ({
  parsedContent,
  tripId,
  onSuggestionApplied,
  onDismiss,
}) => {
  if (!parsedContent || !parsedContent.suggestions || parsedContent.suggestions.length === 0) {
    return null;
  }

  const handleApplySuggestion = async (suggestion: ParsedContent['suggestions'][0]) => {
    try {
      const result = await applySuggestion(suggestion, tripId);
      if (result) {
        toast.success(suggestion.message);
        onSuggestionApplied?.();
      } else {
        toast.error('Failed to apply suggestion');
      }
    } catch (error) {
      console.error('[ParsedContentSuggestions] Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    }
  };

  const getIcon = (action: string) => {
    switch (action) {
      case 'create_calendar_event':
        return <Calendar className="w-4 h-4" />;
      case 'create_todo':
        return <CheckSquare className="w-4 h-4" />;
      case 'extract_receipt':
        return <Receipt className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTitle = () => {
    switch (parsedContent.type) {
      case 'receipt':
        return 'Receipt Detected';
      case 'itinerary':
        return 'Itinerary Parsed';
      case 'message':
        return 'Smart Suggestions';
      default:
        return 'Content Suggestions';
    }
  };

  const getDescription = () => {
    switch (parsedContent.type) {
      case 'receipt':
        return `Found receipt data. Would you like to extract it?`;
      case 'itinerary':
        return `Found ${parsedContent.itinerary?.events.length || 0} calendar events. Add them to your trip?`;
      case 'message':
        return `Detected dates, times, and locations. Create calendar events?`;
      default:
        return 'Apply these suggestions to enhance your trip';
    }
  };

  return (
    <Card className="mb-4 border-blue-500/50 bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                {getTitle()}
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 mt-1">
                {getDescription()}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {parsedContent.suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-blue-400 flex-shrink-0">
                  {getIcon(suggestion.action)}
                </div>
                <span className="text-sm text-gray-300 truncate">
                  {suggestion.message}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 text-xs h-7 px-3 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                onClick={() => handleApplySuggestion(suggestion)}
              >
                Apply
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
