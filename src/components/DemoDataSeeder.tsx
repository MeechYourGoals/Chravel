import React, { useState } from 'react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database } from 'lucide-react';

interface DemoDataSeederProps {
  tripId: string;
  onSeeded?: () => void;
}

export const DemoDataSeeder = ({ tripId, onSeeded }: DemoDataSeederProps) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const seedDemoData = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { tripId },
      });

      if (error) throw error;

      toast({
        title: 'Demo data seeded successfully!',
        description: `Added ${data.counts.messages} messages, ${data.counts.polls} polls, ${data.counts.files} files, and ${data.counts.links} links. AI knowledge graph updated.`,
      });

      onSeeded?.();
    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast({
        title: 'Failed to seed demo data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      onClick={seedDemoData}
      disabled={isSeeding}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
      {isSeeding ? 'Seeding Demo Data...' : 'Seed Demo Data'}
    </Button>
  );
};
