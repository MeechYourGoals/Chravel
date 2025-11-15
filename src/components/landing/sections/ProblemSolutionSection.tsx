
import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { Users } from 'lucide-react';

const ProblemSolutionSection: React.FC = () => {
  return (
    <FullPageLandingSection
      id="problem-solution"
      videoSrc="https://storage.googleapis.com/veo-video-examples/travel-chaos-vs-chravel.mp4"
      imageFallback="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?q=80&w=2070&auto=format&fit=crop"
      videoOpacity={0.7}
    >
      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold">Collaborate in Real-Time</h2>
        <p className="mt-4 text-lg md:text-xl">
          Plan together with live updates, chat, and shared itineraries. Say goodbye to endless group texts and conflicting spreadsheets.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold text-2xl mb-2">Live Updates</h3>
            <p className="text-base text-foreground/80">
              See changes instantly as your group members update plans.
            </p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold text-2xl mb-2">Group Chat</h3>
            <p className="text-base text-foreground/80">
              Keep all trip-related conversations in one organized place.
            </p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold text-2xl mb-2">Shared Itinerary</h3>
            <p className="text-base text-foreground/80">
              Everyone has access to the latest version of the trip plan.
            </p>
          </div>
        </div>
      </div>
    </FullPageLandingSection>
  );
};

export default ProblemSolutionSection;
