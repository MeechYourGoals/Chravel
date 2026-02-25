import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';

interface Participant {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  name: string;
  avatar: string;
}

interface Trip {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  title: string;
  location: string;
  dateRange: string;
  participants: Participant[];
}

export interface ColorTheme {
  name: string;
  background: string;
  overlay: string;
}

interface TripPosterGeneratorProps {
  trip: Trip;
  colorTheme?: ColorTheme;
}

export const TripPosterGenerator = ({ trip, colorTheme }: TripPosterGeneratorProps) => {
  const taglines = [
    "Let's make memories!",
    'Adventure awaits!',
    'Ready for an epic trip?',
    'Join the adventure!',
  ];

  const randomTagline = taglines[Math.floor(Math.random() * taglines.length)];

  // Default theme if none provided
  const defaultTheme: ColorTheme = {
    name: 'gold',
    background:
      'linear-gradient(135deg, hsl(45 93% 58%) 0%, hsl(43 89% 38%) 50%, hsl(41 85% 28%) 100%)',
    overlay: 'bg-gradient-to-b from-black/20 via-black/30 to-black/40',
  };

  const theme = colorTheme || defaultTheme;

  return (
    <div
      id="trip-poster"
      className="relative w-[540px] h-[675px] rounded-3xl p-8 overflow-hidden animate-scale-in"
      style={{
        background: theme.background,
        boxShadow: '0px 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* Background overlay for text readability */}
      <div className={`absolute inset-0 ${theme.overlay} rounded-3xl`} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 leading-tight">{trip.title}</h1>

          {/* Location */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin size={24} className="text-primary-foreground" />
            <span className="text-2xl text-white/90">{trip.location}</span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Calendar size={24} className="text-primary-foreground" />
            <span className="text-2xl text-white/90">{trip.dateRange}</span>
          </div>
        </div>

        {/* Travelers Section */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 mb-6">
            <Users size={28} className="text-primary-foreground" />
            <span className="text-3xl font-semibold">
              {trip.participants.length} Chraveler{trip.participants.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Avatars */}
          {trip.participants.length > 0 && (
            <div className="flex justify-center -space-x-4 mb-8">
              {trip.participants.slice(0, 5).map((participant, index) => (
                <div
                  key={participant.id}
                  className="relative"
                  style={{ zIndex: trip.participants.length - index }}
                >
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                  />
                </div>
              ))}
              {trip.participants.length > 5 && (
                <div className="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center text-lg font-bold shadow-lg">
                  +{trip.participants.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xl italic text-white/90 mb-4">{randomTagline}</p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl py-3 px-6">
            <p className="text-lg font-medium">Plan your next adventure with us</p>
          </div>
        </div>
      </div>
    </div>
  );
};
