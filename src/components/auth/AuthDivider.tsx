import React from 'react';

interface AuthDividerProps {
  /** Text to display in the divider (default: 'or continue with') */
  text?: string;
}

/**
 * Divider component for separating OAuth buttons from email/password forms.
 * Displays a horizontal line with centered text.
 */
export const AuthDivider: React.FC<AuthDividerProps> = ({ text = 'or continue with' }) => {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/20" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-transparent px-4 text-gray-400">{text}</span>
      </div>
    </div>
  );
};

export default AuthDivider;
