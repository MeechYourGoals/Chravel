import React from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatMessage } from './types';
import { GoogleMapsWidget } from './GoogleMapsWidget';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageRenderer } from './MessageRenderer';

interface ChatMessagesProps {
  messages: (ChatMessage | ChatMessageWithGrounding)[];
  isTyping: boolean;
  showMapWidgets?: boolean;
}

export const ChatMessages = ({ messages, isTyping, showMapWidgets = false }: ChatMessagesProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle size={48} className="text-gray-600 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-400 mb-2">Start the conversation</h4>
        <p className="text-gray-500 text-sm">Send a message to get the chat started!</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => {
        const messageWithGrounding = message as ChatMessageWithGrounding;
        return (
          <div key={message.id} className="space-y-2">
            <MessageRenderer message={message} showMapWidgets={showMapWidgets} />
            
            {/* Render grounding widget: search entry point HTML or Maps context token */}
            {showMapWidgets && messageWithGrounding.googleMapsWidget && (
              <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {messageWithGrounding.googleMapsWidget.trimStart().startsWith('<') ? (
                  // searchEntryPoint.renderedContent from Gemini Search grounding is raw HTML
                  // (a "Verified by Google Search" badge). Render it inline directly.
                  <div
                    className="max-w-xs text-xs text-gray-400 my-1 [&_a]:text-blue-400 [&_a]:no-underline [&_a:hover]:underline"
                    dangerouslySetInnerHTML={{ __html: messageWithGrounding.googleMapsWidget }}
                  />
                ) : (
                  // Actual Google Maps gmp-place-contextual context token
                  <GoogleMapsWidget widgetToken={messageWithGrounding.googleMapsWidget} />
                )}
              </div>
            )}
            
            {/* 🆕 Enhanced: Show grounding sources with badge */}
            {messageWithGrounding.sources && messageWithGrounding.sources.length > 0 && (
              <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="space-y-1 px-2 max-w-xs lg:max-w-md">
                  <div className="text-xs font-medium text-gray-400 flex items-center gap-2">
                    <span>Sources:</span>
                    {messageWithGrounding.sources.some(s => s.source === 'google_search_grounding') && (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px]">
                        Verified by Google Search
                      </span>
                    )}
                    {messageWithGrounding.sources.some(s => s.source === 'google_maps_grounding') && (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px]">
                        Verified by Google Maps
                      </span>
                    )}
                  </div>
                  {messageWithGrounding.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-400 hover:text-blue-300"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-4 border border-blue-500/20">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
