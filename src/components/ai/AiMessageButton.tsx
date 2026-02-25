import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface AiMessageButtonProps {
  onClick: () => void;
}

export const AiMessageButton = ({ onClick }: AiMessageButtonProps) => {
  return (
    <div className="flex justify-center mt-3">
      <Button
        onClick={onClick}
        variant="outline"
        size="sm"
        className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105"
      >
        <Sparkles size={14} className="mr-2" />
        Ask AI to write a message
      </Button>
    </div>
  );
};
