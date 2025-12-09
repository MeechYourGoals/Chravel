import React, { useState } from 'react';
import { Search, Users, X, Mic, Calendar } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { Speaker } from '../../types/events';

interface LineupTabProps {
  speakers: Speaker[];
  userRole: string;
}

export const LineupTab = ({ speakers, userRole }: LineupTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  const filteredSpeakers = speakers.filter(speaker =>
    speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    speaker.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    speaker.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Users size={24} className="text-orange-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Line-up</h2>
          <p className="text-gray-400 text-sm">Speakers, artists, and presenters at this event</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, title, or company..."
          className="pl-10 bg-gray-800/50 border-gray-700 text-white"
        />
      </div>

      {/* Speakers Grid */}
      {filteredSpeakers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpeakers.map(speaker => (
            <Card 
              key={speaker.id} 
              className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer"
              onClick={() => setSelectedSpeaker(speaker)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {speaker.avatar ? (
                      <img src={speaker.avatar} alt={speaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <Mic size={20} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{speaker.name}</h3>
                    {speaker.title && (
                      <p className="text-gray-400 text-sm truncate">{speaker.title}</p>
                    )}
                    {speaker.company && (
                      <p className="text-orange-400 text-xs truncate">{speaker.company}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : speakers.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-12 text-center">
            <Users size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Line-up Yet</h3>
            <p className="text-gray-400">
              Speakers and performers will be announced soon
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-8 text-center">
            <Search size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No results found for "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}

      {/* Speaker Detail Modal */}
      {selectedSpeaker && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSpeaker(null)}
        >
          <Card 
            className="bg-gray-900 border-gray-700 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {selectedSpeaker.avatar ? (
                      <img src={selectedSpeaker.avatar} alt={selectedSpeaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <Mic size={28} className="text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedSpeaker.name}</h2>
                    {selectedSpeaker.title && (
                      <p className="text-gray-400">{selectedSpeaker.title}</p>
                    )}
                    {selectedSpeaker.company && (
                      <p className="text-orange-400 text-sm">{selectedSpeaker.company}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedSpeaker(null)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </Button>
              </div>

              {selectedSpeaker.bio && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">About</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedSpeaker.bio}</p>
                </div>
              )}

              {selectedSpeaker.sessions && selectedSpeaker.sessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Calendar size={14} />
                    Sessions
                  </h3>
                  <div className="space-y-2">
                    {selectedSpeaker.sessions.map((sessionId, idx) => (
                      <div 
                        key={sessionId} 
                        className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300"
                      >
                        Session {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
