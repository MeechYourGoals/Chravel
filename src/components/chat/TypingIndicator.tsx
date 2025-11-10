/**
 * Typing Indicator Component
 * Shows who is currently typing in the chat
 */
import React from 'react';

interface TypingIndicatorProps {
  typingUsers: Array<{ userId: string; userName: string }>;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map(u => u.userName);
  let message = '';

  if (names.length === 1) {
    message = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    message = `${names[0]} and ${names[1]} are typing...`;
  } else {
    message = `${names[0]} and ${names.length - 1} others are typing...`;
  }

  return (
    <div className="px-4 py-2 text-sm text-gray-400 italic animate-pulse">
      {message}
    </div>
  );
};
