import React, { useState } from 'react';
import { Users, Search, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Speaker } from '../../types/events';

interface SpeakerDirectoryProps {
  speakers: Speaker[];
  userRole: 'organizer' | 'speaker' | 'exhibitor' | 'attendee';
}

export const SpeakerDirectory = ({ speakers, userRole }: SpeakerDirectoryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  const filteredSpeakers = speakers.filter(
    speaker =>
      speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Performers</h2>
          <p className="text-gray-400 text-sm">Speakers, artists, and performers at this event</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <Input
          type="text"
          placeholder="Search by name, role, or company..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
        />
      </div>

      {/* Speakers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpeakers.map(speaker => (
          <Card
            key={speaker.id}
            className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors"
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <img
                  src={speaker.avatar}
                  alt={speaker.name}
                  className="w-20 h-20 rounded-full mb-4"
                />
                <h3 className="text-white font-semibold text-lg mb-1">{speaker.name}</h3>
                {speaker.performerType && (
                  <span className="inline-block bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded mb-2">
                    {speaker.performerType.charAt(0).toUpperCase() + speaker.performerType.slice(1)}
                  </span>
                )}
                <p className="text-gray-400 text-sm mb-1">{speaker.title}</p>
                {speaker.company && <p className="text-gray-500 text-sm mb-4">{speaker.company}</p>}

                <div className="flex items-center gap-1 text-yellow-400 mb-3">
                  <Star size={16} fill="currentColor" />
                  <span className="text-sm font-medium">
                    {speaker.sessions.length} session{speaker.sessions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-3">{speaker.bio}</p>

                <Button
                  onClick={() => setSelectedSpeaker(speaker)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Speaker Detail Modal */}
      {selectedSpeaker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedSpeaker.avatar}
                    alt={selectedSpeaker.name}
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <CardTitle className="text-white text-xl">{selectedSpeaker.name}</CardTitle>
                    <p className="text-gray-400">
                      {selectedSpeaker.title} at {selectedSpeaker.company}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSpeaker(null)}
                  className="border-gray-600 text-gray-300"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Bio */}
              <div>
                <h4 className="text-white font-semibold mb-2">Biography</h4>
                <p className="text-gray-300">{selectedSpeaker.bio}</p>
              </div>

              {/* Sessions */}
              <div>
                <h4 className="text-white font-semibold mb-3">Speaking Sessions</h4>
                <div className="space-y-2">
                  {selectedSpeaker.sessions.map((sessionId, index) => (
                    <div key={index} className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-white font-medium">Session {sessionId}</div>
                      <div className="text-gray-400 text-sm">
                        Details would be populated from session data
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
