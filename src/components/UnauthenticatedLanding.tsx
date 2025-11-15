import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Users, Calendar, MapPin, Sparkles, ChevronDown } from 'lucide-react';

interface UnauthenticatedLandingProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const UnauthenticatedLanding = ({ onSignIn, onSignUp }: UnauthenticatedLandingProps) => {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    // Ensure videos autoplay when in view
    videoRefs.current.forEach((video) => {
      if (video) {
        video.play().catch(() => {
          // Autoplay might be blocked, that's okay
        });
      }
    });
  }, []);

  const scrollToNextSection = () => {
    const sections = document.querySelectorAll('.snap-section');
    const currentScroll = window.scrollY;
    const viewportHeight = window.innerHeight;
    const nextSectionIndex = Math.floor(currentScroll / viewportHeight) + 1;

    if (nextSectionIndex < sections.length) {
      sections[nextSectionIndex].scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="snap-container">
      {/* Section 1: Hero */}
      <section className="snap-section relative overflow-hidden">
        <div className="video-background">
          <video
            ref={(el) => (videoRefs.current[0] = el)}
            autoPlay
            loop
            muted
            playsInline
            className="video-element"
          >
            <source src="https://cdn.coverr.co/videos/coverr-friends-planning-a-trip-together-6363/1080p.mp4" type="video/mp4" />
          </video>
          <div className="video-overlay" />
        </div>

        <div className="section-content">
          <div className="max-w-5xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-2xl">
              Plan Together.<br />Travel Better.
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              The AI-powered platform for collaborative trip planning, real-time coordination, and unforgettable group experiences.
            </p>

            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={onSignUp}
                className="text-lg md:text-xl px-8 py-6 md:px-10 md:py-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl hover:scale-105 transition-transform"
              >
                Get Started Free · Log In or Sign Up
              </Button>
            </div>

            <p className="text-base md:text-lg text-white/90 pt-2 drop-shadow-md">
              Join thousands of travelers coordinating trips worldwide
            </p>
          </div>

          <button
            onClick={scrollToNextSection}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors animate-bounce"
            aria-label="Scroll to next section"
          >
            <ChevronDown size={40} />
          </button>
        </div>
      </section>

      {/* Section 2: Collaborate in Real-Time */}
      <section className="snap-section relative overflow-hidden">
        <div className="video-background">
          <video
            ref={(el) => (videoRefs.current[1] = el)}
            autoPlay
            loop
            muted
            playsInline
            className="video-element"
          >
            <source src="https://cdn.coverr.co/videos/coverr-group-of-friends-looking-at-a-phone-5016/1080p.mp4" type="video/mp4" />
          </video>
          <div className="video-overlay" />
        </div>

        <div className="section-content">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="bg-primary/20 backdrop-blur-sm w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/30">
              <Users className="text-white" size={40} />
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-2xl">
              Collaborate in Real-Time
            </h2>

            <p className="text-xl sm:text-2xl md:text-3xl text-white/95 max-w-2xl mx-auto drop-shadow-lg">
              Plan together with live updates, chat, and shared itineraries
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                <Users size={18} className="text-white" />
                <span className="text-base md:text-lg text-white font-medium">Group Planning</span>
              </div>
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                <Calendar size={18} className="text-white" />
                <span className="text-base md:text-lg text-white font-medium">Smart Itineraries</span>
              </div>
            </div>
          </div>

          <button
            onClick={scrollToNextSection}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors animate-bounce"
            aria-label="Scroll to next section"
          >
            <ChevronDown size={40} />
          </button>
        </div>
      </section>

      {/* Section 3: AI-Powered Assistance */}
      <section className="snap-section relative overflow-hidden">
        <div className="video-background">
          <video
            ref={(el) => (videoRefs.current[2] = el)}
            autoPlay
            loop
            muted
            playsInline
            className="video-element"
          >
            <source src="https://cdn.coverr.co/videos/coverr-woman-using-phone-in-city-4458/1080p.mp4" type="video/mp4" />
          </video>
          <div className="video-overlay" />
        </div>

        <div className="section-content">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="bg-accent/20 backdrop-blur-sm w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-accent/30">
              <Sparkles className="text-white" size={40} />
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-2xl">
              AI-Powered Assistance
            </h2>

            <p className="text-xl sm:text-2xl md:text-3xl text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              AI-powered assistance with verified data and real-world context — from venues and hotels to weather and routes.
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                <Sparkles size={18} className="text-white" />
                <span className="text-base md:text-lg text-white font-medium">AI Concierge</span>
              </div>
            </div>
          </div>

          <button
            onClick={scrollToNextSection}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors animate-bounce"
            aria-label="Scroll to next section"
          >
            <ChevronDown size={40} />
          </button>
        </div>
      </section>

      {/* Section 4: Everything in One Place */}
      <section className="snap-section relative overflow-hidden">
        <div className="video-background">
          <video
            ref={(el) => (videoRefs.current[3] = el)}
            autoPlay
            loop
            muted
            playsInline
            className="video-element"
          >
            <source src="https://cdn.coverr.co/videos/coverr-person-checking-travel-map-on-phone-8156/1080p.mp4" type="video/mp4" />
          </video>
          <div className="video-overlay" />
        </div>

        <div className="section-content">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="bg-primary/20 backdrop-blur-sm w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/30">
              <MapPin className="text-white" size={40} />
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-2xl">
              Everything in One Place
            </h2>

            <p className="text-xl sm:text-2xl md:text-3xl text-white/95 max-w-2xl mx-auto drop-shadow-lg">
              Maps, schedules, expenses, and memories—all organized
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                <MapPin size={18} className="text-white" />
                <span className="text-base md:text-lg text-white font-medium">Real-Time Maps</span>
              </div>
            </div>
          </div>

          <button
            onClick={scrollToNextSection}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors animate-bounce"
            aria-label="Scroll to next section"
          >
            <ChevronDown size={40} />
          </button>
        </div>
      </section>

      {/* Section 5: Final CTA */}
      <section className="snap-section relative overflow-hidden bg-gradient-to-br from-primary via-accent to-primary">
        <div className="section-content">
          <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-2xl">
              Ready to Transform Your Group Travel?
            </h2>

            <p className="text-xl sm:text-2xl md:text-3xl text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              Join thousands of travelers who plan smarter, coordinate easier, and create unforgettable experiences together.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-5 py-3 flex items-center gap-2">
                <Users size={20} className="text-white" />
                <span className="text-lg text-white font-medium">Group Planning</span>
              </div>
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-5 py-3 flex items-center gap-2">
                <Calendar size={20} className="text-white" />
                <span className="text-lg text-white font-medium">Smart Itineraries</span>
              </div>
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-5 py-3 flex items-center gap-2">
                <MapPin size={20} className="text-white" />
                <span className="text-lg text-white font-medium">Real-Time Maps</span>
              </div>
              <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-5 py-3 flex items-center gap-2">
                <Sparkles size={20} className="text-white" />
                <span className="text-lg text-white font-medium">AI Concierge</span>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button
                size="lg"
                onClick={onSignUp}
                className="text-xl px-12 py-8 bg-white hover:bg-white/90 text-primary shadow-2xl hover:scale-105 transition-transform font-bold"
              >
                Get Started Free · Log In or Sign Up
              </Button>
            </div>

            <p className="text-lg text-white/90 pt-4 drop-shadow-md">
              No credit card required • Free forever
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
