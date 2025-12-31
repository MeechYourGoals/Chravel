import React, { useState, useMemo } from 'react';
import { Compass, Bookmark, TrendingUp, MapPin, Search, X } from 'lucide-react';
import { SavedRecommendations } from '@/components/SavedRecommendations';
import { RecommendationCard } from '@/components/RecommendationCard';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const ChravelRecsPage = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchCity, setSearchCity] = useState('');
  const [appliedCityFilter, setAppliedCityFilter] = useState('');
  const { recommendations } = useRecommendations(activeFilter);
  const { toggleSave } = useSavedRecommendations();

  // Filter recommendations by city if a city filter is applied
  const filteredRecommendations = useMemo(() => {
    if (!appliedCityFilter) {
      return recommendations;
    }
    const normalizedFilter = appliedCityFilter.toLowerCase().trim();
    return recommendations.filter(
      rec =>
        rec.city?.toLowerCase().includes(normalizedFilter) ||
        rec.location?.toLowerCase().includes(normalizedFilter),
    );
  }, [recommendations, appliedCityFilter]);

  const sponsoredRecs = filteredRecommendations.filter(rec => rec.isSponsored);

  const handleCitySearch = () => {
    setAppliedCityFilter(searchCity);
  };

  const clearCityFilter = () => {
    setSearchCity('');
    setAppliedCityFilter('');
  };

  const handleSaveToTrip = async (rec: any) => {
    await toggleSave(rec);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <Compass size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">Chravel Recs</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          Discover amazing places, save favorites, and add them to your trips
        </p>

        {/* City/Location Search */}
        <div className="max-w-xl">
          <label className="text-sm text-muted-foreground mb-2 block">
            Search by city or location to see recommendations near your trip
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search city or location..."
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleCitySearch();
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCitySearch} disabled={!searchCity.trim()}>
              Search
            </Button>
            {appliedCityFilter && (
              <Button variant="outline" onClick={clearCityFilter}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {appliedCityFilter && (
            <p className="text-sm text-primary mt-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Showing recommendations for: <strong>{appliedCityFilter}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-6 space-y-8">
        {/* Featured Recommendations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-xl font-semibold">Featured Places</h2>
          </div>

          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
            <ScrollArea className="w-full mb-6 md:mb-0">
              <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-7 mb-6">
                <TabsTrigger value="all" className="whitespace-nowrap">
                  All
                </TabsTrigger>
                <TabsTrigger value="hotel" className="whitespace-nowrap">
                  Hotels
                </TabsTrigger>
                <TabsTrigger value="restaurant" className="whitespace-nowrap">
                  Dining
                </TabsTrigger>
                <TabsTrigger value="activity" className="whitespace-nowrap">
                  Activities
                </TabsTrigger>
                <TabsTrigger value="tour" className="whitespace-nowrap">
                  Tours
                </TabsTrigger>
                <TabsTrigger value="experience" className="whitespace-nowrap">
                  Experiences
                </TabsTrigger>
                <TabsTrigger value="transportation" className="whitespace-nowrap">
                  Transport
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" className="md:hidden" />
            </ScrollArea>

            <TabsContent value={activeFilter} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sponsoredRecs.map(rec => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onSaveToTrip={handleSaveToTrip}
                  />
                ))}
              </div>
              {sponsoredRecs.length === 0 && (
                <div className="bg-muted/50 border border-border rounded-xl p-6 text-center">
                  <p className="text-muted-foreground">
                    {appliedCityFilter
                      ? `No featured places found in "${appliedCityFilter}". Try searching for a different city.`
                      : 'No featured places in this category yet.'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Saved Recommendations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bookmark size={20} className="text-primary" />
            <h2 className="text-xl font-semibold">Your Saved Places</h2>
          </div>
          <SavedRecommendations />
        </section>
      </div>
    </div>
  );
};

export default ChravelRecsPage;
