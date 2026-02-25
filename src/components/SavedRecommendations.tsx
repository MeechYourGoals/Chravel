import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, BookmarkMinus } from 'lucide-react';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { tripsData } from '@/data/tripsData';
import { useToast } from '@/hooks/use-toast';

export const SavedRecommendations = () => {
  const { items, loading, addToTrip, refresh } = useSavedRecommendations();
  const { toast } = useToast();
  const [selectedTrip, setSelectedTrip] = useState<Record<string, string>>({});

  const trips = useMemo(
    () => tripsData.map(t => ({ id: String(t.id), label: `${t.title} • ${t.location}` })),
    [],
  );

  const handleAdd = async (savedId: string, tripId: string) => {
    const saved = items.find(i => i.id === savedId);
    if (!saved) return;
    const res = await addToTrip(saved, tripId);
    if (res.status === 'ok') {
      toast({ title: 'Added to trip', description: `${saved.title} added successfully.` });
    } else {
      toast({ title: 'Sign in required', description: 'Please sign in to add items to trips.' });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground">Saved Recommendations</h3>
      <p className="text-muted-foreground">
        Items you saved while browsing recommendations. Add any of these to a specific trip.
      </p>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No saved recommendations yet.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} className="p-4 flex gap-4">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-24 h-24 rounded-md object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center">
                  <BookmarkMinus className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-foreground truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.rec_type}
                      </Badge>
                      {(item.location || item.city) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location || item.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Select
                    onValueChange={val => setSelectedTrip(prev => ({ ...prev, [item.id]: val }))}
                    value={selectedTrip[item.id]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a trip" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectGroup>
                        {trips.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!selectedTrip[item.id]}
                    onClick={() => handleAdd(item.id, selectedTrip[item.id])}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add to Trip
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
