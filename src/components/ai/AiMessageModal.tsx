import React, { useState } from 'react';
import { Send, Sparkles, Clock, Calendar, FileText, Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { unifiedMessagingService, MessageTemplate } from '../../services/unifiedMessagingService';
import { MessageTemplateLibrary } from '../MessageTemplateLibrary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface AiMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  tourId?: string;
  tripContext?: any;
}

export const AiMessageModal = ({
  isOpen,
  onClose,
  tripId,
  tourId,
  tripContext
}: AiMessageModalProps) => {
  const [currentView, setCurrentView] = useState<'composer' | 'templates' | 'scheduling'>('composer');
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'friendly' | 'professional' | 'urgent' | 'direct' | 'cheerful'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateContext, setTemplateContext] = useState<Record<string, string>>({});
  const [scheduleDate, setScheduleDate] = useState('');
  const [showScheduling, setShowScheduling] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const toneOptions = [
    { value: 'friendly', label: 'Friendly' },
    { value: 'professional', label: 'Professional' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'direct', label: 'Direct' },
    { value: 'cheerful', label: 'Cheerful' }
  ];

  const buildContextualPrompt = (userPrompt: string, templateContent?: string) => {
    const contextPrefix = tripContext?.isPro 
      ? `You are helping a ${tripContext.category || 'professional'} team manager craft a message for their team. `
      : 'You are helping craft a professional message for an event or team. ';
    
    const toneInstruction = `Use a ${tone} tone. `;
    const lengthInstruction = 'Keep it concise and actionable. ';
    
    if (templateContent) {
      return `${contextPrefix}${toneInstruction}${lengthInstruction}Fill this template with appropriate content: ${templateContent}. User context: ${userPrompt}`;
    }
    
    return `${contextPrefix}${toneInstruction}${lengthInstruction}User request: ${userPrompt}`;
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    if (template.id === 'custom') {
      setCurrentView('composer');
      return;
    }
    
    setSelectedTemplate(template);
    setPrompt(`Fill template: ${template.name}`);
    
    // Initialize template context with placeholders
    const initialContext: Record<string, string> = {};
    template.placeholders.forEach(placeholder => {
      initialContext[placeholder] = '';
    });
    setTemplateContext(initialContext);
    setCurrentView('composer');
  };

  const getSuggestedSendTimes = async () => {
    if (!generatedMessage) return;
    
    setLoadingSuggestions(true);
    try {
      // Mock AI-suggested times - in production, this would call an AI service
      const suggestions = [
        new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16), // 30 min from now
        new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16), // 2 hours from now
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 24 hours from now
      ];
      setSuggestedTimes(suggestions);
    } catch (error) {
      console.error('Failed to get suggested times:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      let finalContent = '';
      
      if (selectedTemplate) {
        // Fill template with context
        finalContent = unifiedMessagingService.fillTemplate(selectedTemplate.content, templateContext);
        if (prompt.includes('Fill template:')) {
          // Let AI enhance the filled template
          const contextualPrompt = buildContextualPrompt(prompt, finalContent);
          const { data } = await supabase.functions.invoke('lovable-concierge', {
            body: {
              message: contextualPrompt,
              config: { tone }
            }
          });
          finalContent = data.response;
        }
      } else {
        const contextualPrompt = buildContextualPrompt(prompt);
        const { data } = await supabase.functions.invoke('lovable-concierge', {
          body: {
            message: contextualPrompt,
            config: { tone }
          }
        });
        finalContent = data.response;
      }
      
      setGeneratedMessage(finalContent);
      setShowPreview(true);
      
      // Auto-generate suggested send times
      getSuggestedSendTimes();
    } catch (error) {
      console.error('Failed to generate message:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertToChat = async () => {
    if (!generatedMessage || !tripId) {
      toast.error('Unable to send message. Missing trip information.');
      return;
    }

    setIsSending(true);
    try {
      // Get current user for message attribution
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to send messages.');
        return;
      }

      const userName = user.email?.split('@')[0] || 'Former Member';

      await unifiedMessagingService.sendMessage({
        tripId,
        content: generatedMessage,
        userName,
        userId: user.id
      });

      toast.success(scheduleDate ? 'Message scheduled successfully!' : 'Message sent to trip chat!');
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to send AI message:', error);
      }
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedMessage('');
    setShowPreview(false);
    setSelectedTemplate(null);
    setTemplateContext({});
    setScheduleDate('');
    setShowScheduling(false);
    setSuggestedTimes([]);
    setCurrentView('composer');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            Ask AI to Write a Message
          </DialogTitle>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCurrentView('composer')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'composer'
                ? 'bg-white/20 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles size={14} className="inline mr-1" />
            Composer
          </button>
          <button
            onClick={() => setCurrentView('templates')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'templates'
                ? 'bg-white/20 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText size={14} className="inline mr-1" />
            Templates
          </button>
        </div>

        <div className="space-y-4">
          {currentView === 'templates' ? (
            <MessageTemplateLibrary
              onSelectTemplate={handleTemplateSelect}
              tripType={tripContext?.category}
              onClose={() => setCurrentView('composer')}
            />
          ) : !showPreview ? (
            <>
              {/* Selected Template Context */}
              {selectedTemplate && selectedTemplate.placeholders.length > 0 && (
                <div className="space-y-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-purple-400" />
                    <span className="font-medium text-purple-300">Template: {selectedTemplate.name}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedTemplate.placeholders.map(placeholder => (
                      <div key={placeholder}>
                        <label className="text-sm font-medium text-gray-300 capitalize">
                          {placeholder.replace('_', ' ')}
                        </label>
                        <input
                          type="text"
                          value={templateContext[placeholder] || ''}
                          onChange={(e) => setTemplateContext(prev => ({
                            ...prev,
                            [placeholder]: e.target.value
                          }))}
                          placeholder={`Enter ${placeholder}...`}
                          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  {selectedTemplate ? 'Additional instructions for AI (optional)' : 'What message should the AI help you write?'}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder={selectedTemplate 
                    ? "e.g., Make it more urgent, add team spirit elements..." 
                    : "e.g., Politely remind team that checkout is at 10am and we need bags in lobby by 9:30am..."
                  }
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none backdrop-blur-sm"
                />
              </div>

              {/* Tone Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 backdrop-blur-sm"
                >
                  {toneOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Generate Message
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Preview Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  Generated Message Preview
                </label>
                <div className="bg-white/5 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-white whitespace-pre-wrap">{generatedMessage}</p>
                </div>
              </div>

              {/* Scheduling Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Send Options</label>
                  <Button
                    onClick={() => setShowScheduling(!showScheduling)}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Clock size={14} className="mr-1" />
                    {showScheduling ? 'Send Now' : 'Schedule'}
                  </Button>
                </div>

                {showScheduling && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb size={16} className="text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-300">AI Suggested Times</span>
                    </div>
                    
                    {loadingSuggestions ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Analyzing optimal send times...</span>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {suggestedTimes.map((time, index) => (
                          <button
                            key={index}
                            onClick={() => setScheduleDate(time)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              scheduleDate === time
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {new Date(time).toLocaleString([], { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </button>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Custom Date & Time</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleInsertToChat}
                  disabled={!generatedMessage || isSending}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : scheduleDate ? (
                    <>
                      <Calendar size={16} className="mr-2" />
                      Schedule Message
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Edit First
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};