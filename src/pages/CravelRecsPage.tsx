import React, { useState } from 'react';
import { Compass, Bookmark, TrendingUp, MapPin } from 'lucide-react';
import { SavedRecommendations } from '@/components/SavedRecommendations';
import { RecommendationCard } from '@/components/RecommendationCard';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CravelRecsPage = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const { recommendations } = useRecommendations(activeFilter);
  const { toggleSave, isSaved } = useSavedRecommendations();

  const sponsoredRecs = recommendations.filter(rec => rec.isSponsored);

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
        <p className="text-muted-foreground">
          Discover amazing places, save favorites, and add them to your trips
        </p>
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
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="hotel">Hotels</TabsTrigger>
              <TabsTrigger value="restaurant">Dining</TabsTrigger>
              <TabsTrigger value="activity">Activities</TabsTrigger>
              <TabsTrigger value="tour">Tours</TabsTrigger>
              <TabsTrigger value="experience">Experiences</TabsTrigger>
              <TabsTrigger value="transportation">Transport</TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sponsoredRecs.map((rec) => (
                  <RecommendationCard 
                    key={rec.id} 
                    recommendation={rec}
                    onSaveToTrip={handleSaveToTrip}
                  />
                ))}
              </div>
              {sponsoredRecs.length === 0 && (
                <div className="bg-muted/50 border border-border rounded-xl p-6 text-center">
                  <p className="text-muted-foreground">No featured places in this category yet.</p>
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

export default CravelRecsPage;
