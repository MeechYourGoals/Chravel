import React from 'react';
import { MessageSquare, Calendar, Image, DollarSign, MapPin, CheckSquare } from 'lucide-react';
import pollsVoting from '@/assets/app-screenshots/polls-voting.png';

const storageTypes = [
  {
    icon: <MessageSquare size={24} />,
    label: 'Chat & Broadcasts',
    description: 'Store every conversation, announcement, and last-minute change in one searchable thread.'
  },
  {
    icon: <Calendar size={24} />,
    label: 'Calendar & Itinerary',
    description: 'Store all games, events, reservations, and deadlines on a shared schedule everyone can see.'
  },
  {
    icon: <Image size={24} />,
    label: 'Media & Files',
    description: 'Store photos, videos, PDFs, and waivers — from boarding passes to team rosters and vendor contracts.'
  },
  {
    icon: <DollarSign size={24} />,
    label: 'Payments',
    description: 'Store who paid what, who still owes, and receipts — with a complete audit trail.'
  },
  {
    icon: <MapPin size={24} />,
    label: 'Places & Basecamp',
    description: 'Store hotel and Airbnb addresses, fields, venues, and your personal "home base" for the trip or season.'
  },
  {
    icon: <CheckSquare size={24} />,
    label: 'Polls & Tasks',
    description: 'Store decisions and to-dos — who\'s bringing snacks, which restaurant won, what\'s still outstanding.'
  }
];

export const SocialStorageSection = () => {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-start md:justify-center min-h-0 md:min-h-screen space-y-8 md:space-y-12">
      {/* Headline - positioned at top with white text for contrast */}
      <div className="text-center space-y-4 max-w-4xl pt-8">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
        >
          Your Social Storage Platform
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl px-4 py-3 rounded-xl bg-primary text-white font-semibold">
          ChravelApp allows you to store everything that matters — so no more digging through old emails, text chains, and multiple apps
        </p>
      </div>

      {/* Storage Types Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-6xl w-full">
        {storageTypes.map((type, index) => (
          <div
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-3 sm:p-4 md:p-6 hover:border-primary/50 transition-all duration-300 text-left"
          >
            {/* Inline icon + title */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="bg-primary/10 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                {React.cloneElement(type.icon as React.ReactElement, { size: 18 })}
              </div>
              <h3 className="font-bold text-base sm:text-lg md:text-xl text-primary leading-tight">
                {type.label}
              </h3>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-foreground leading-relaxed line-clamp-3">
              {type.description}
            </p>
          </div>
        ))}
      </div>

      {/* Polls Screenshot Showcase */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300">
          <img 
            src={pollsVoting} 
            alt="Group polls and voting for collaborative decisions" 
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};
