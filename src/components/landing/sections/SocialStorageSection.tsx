import React from 'react';
import { MessageSquare, Calendar, Image, DollarSign, MapPin, CheckSquare } from 'lucide-react';

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
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Headline */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Your Group's Social Storage Layer
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          Chravel is where your group stores everything that matters — so nobody has to dig through old emails or text chains again.
        </p>
      </div>

      {/* Storage Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-6xl w-full">
        {storageTypes.map((type, index) => (
          <div
            key={index}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 md:p-6 hover:border-primary/50 transition-all duration-300 text-left max-w-md mx-auto md:max-w-none"
          >
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-primary">
              {type.icon}
            </div>
            <h3 className="font-bold text-base sm:text-lg md:text-xl mb-3 leading-tight">
              {type.label}
            </h3>
            <p className="text-sm sm:text-base text-foreground leading-relaxed break-words">
              {type.description}
            </p>
          </div>
        ))}
      </div>

      {/* Closing Line */}
      <p className="text-lg sm:text-xl text-foreground text-center max-w-2xl">
        One app to store your group's life — not just your travel.
      </p>
    </div>
  );
};
