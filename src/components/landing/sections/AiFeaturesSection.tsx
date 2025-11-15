
import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { Sparkles, MapPin } from 'lucide-react';

const AiFeaturesSection: React.FC = () => {
  return (
    <FullPageLandingSection
      id="ai-features"
      videoSrc="https://storage.googleapis.com/veo-video-examples/ai-travel-recommendations.mp4"
      imageFallback="https://images.unsplash.com/photo-1679678691006-4a2537a7a245?q=80&w=2070&auto=format&fit=crop"
      videoOpacity={0.7}
    >
      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold">AI-Powered Assistance</h2>
        <p className="mt-4 text-lg md:text-xl">
          AI-powered assistance with verified data and real-world context — from venues and hotels to weather and routes.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center">
                <Sparkles className="text-accent" size={24} />
              </div>
              <h3 className="font-semibold text-2xl">AI Concierge</h3>
            </div>
            <p className="text-base text-foreground/80">
              Get personalized recommendations for restaurants, activities, and attractions based on your group's preferences.
            </p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center">
                <MapPin className="text-accent" size={24} />
              </div>
              <h3 className="font-semibold text-2xl">Smart Basecamp</h3>
            </div>
            <p className="text-base text-foreground/80">
              Our AI suggests the best area to stay based on your itinerary, budget, and travel style, saving you hours of research.
            </p>
          </div>
        </div>
      </div>
    </FullPageLandingSection>
  );
};

export default AiFeaturesSection;
