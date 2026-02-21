import React from 'react';
import { Calendar, Phone, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

interface PersistentCTABarProps {
  viewMode?: string;
  onScheduleDemo?: () => void;
  onSeePricing?: () => void;
}

export const PersistentCTABar = ({
  viewMode = 'tripsPro',
  onScheduleDemo,
  onSeePricing,
}: PersistentCTABarProps) => {
  const getCTAButton = () => {
    if (viewMode === 'events') {
      return (
        <Button
          onClick={() =>
            (window.location.href =
              'mailto:support@chravelapp.com?subject=Requesting%20a%20Chravel%20Demo')
          }
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground flex items-center gap-2 shadow-lg"
        >
          <Phone size={16} />
          Schedule a Demo
        </Button>
      );
    }

    // Default to tripsPro
    return (
      <Button
        onClick={() =>
          (window.location.href =
            'mailto:support@chravelapp.com?subject=Requesting%20a%20Chravel%20Demo')
        }
        className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-lg"
      >
        <Phone size={16} />
        Schedule a Demo
      </Button>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground font-medium">Ready to get started?</div>
          {getCTAButton()}
        </div>
      </div>
    </div>
  );
};
