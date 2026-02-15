import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check, Globe, Sparkles, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TripPassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const passes = [
  {
    id: 'pass-explorer-45',
    tier: 'explorer',
    name: 'Explorer Trip Pass',
    duration: '45 days',
    price: '$29.99',
    icon: <Globe size={24} />,
    description: 'Full Explorer features for one trip window',
    features: [
      'Unlimited saved trips + restore archived',
      '10 AI queries per user per trip',
      'Unlimited PDF exports',
      'Smart Import (Calendar, Agenda, Line-up from URL)',
      'ICS calendar export',
      'Location-aware AI recommendations',
      'Search past trips and memories',
    ],
    nudge: 'Annual Explorer ($99/yr) pays for itself after ~4 passes',
  },
  {
    id: 'pass-frequent-90',
    tier: 'frequent-chraveler',
    name: 'Frequent Chraveler Trip Pass',
    duration: '90 days',
    price: '$74.99',
    icon: <Sparkles size={24} />,
    description: 'Full Frequent Chraveler features for multi-city trips',
    features: [
      'Everything in Explorer Trip Pass',
      'Unlimited AI queries (24/7 concierge)',
      'Smart Import (Calendar, Agenda, Line-up from URL, paste, or file)',
      'Role-based channels & Pro features',
      'Custom trip categories',
      'Early feature access',
    ],
    nudge: 'Annual Frequent ($199/yr) pays for itself after ~3 passes',
  },
];

export const TripPassModal: React.FC<TripPassModalProps> = ({ open, onOpenChange }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (passId: string) => {
    setLoading(passId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to purchase a Trip Pass');
        setLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier: passId,
          purchase_type: 'pass',
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Trip Pass checkout error:', err);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">🎫 Trip Pass</DialogTitle>
          <DialogDescription className="text-center text-base">
            Full premium features for one trip — planning through post-trip. No commitment. Keep
            your exports forever.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {passes.map(pass => (
            <Card key={pass.id} className="bg-card/80 border-border/50 flex flex-col">
              <CardHeader className="text-center pb-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3">
                  {pass.icon}
                </div>
                <CardTitle className="text-lg font-bold">{pass.name}</CardTitle>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Clock size={12} className="mr-1" />
                    {pass.duration}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-foreground mt-2">
                  {pass.price}
                  <span className="text-sm font-normal text-muted-foreground ml-1">one-time</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{pass.description}</p>
              </CardHeader>

              <CardContent className="flex-1 px-4 pb-3">
                <ul className="space-y-2">
                  {pass.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 px-4 pb-4">
                <Button
                  onClick={() => handlePurchase(pass.id)}
                  disabled={loading !== null}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading === pass.id ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Get Trip Pass
                </Button>
                <p className="text-xs text-muted-foreground text-center">{pass.nudge}</p>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Most people choose Annual — pays for itself after ~3 trips.
        </p>
      </DialogContent>
    </Dialog>
  );
};
