
import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trophy } from 'lucide-react';
import { SmartImport } from '../SmartImport';

interface Game {
  id: string;
  opponent: string;
  venue: string;
  venueAddress: string;
  gameDate: string;
  gameTime: string;
  loadInTime: string;
  status: 'confirmed' | 'scheduled' | 'completed' | 'cancelled';
  isHome: boolean;
}

export const GameSchedule = () => {
  const parseConfig = {
    targetType: 'schedule' as const,
    expectedFields: ['opponent', 'date', 'time', 'venue', 'home_away', 'load_in_time'],
    description: 'Import game schedule from league websites, PDF schedules, or CSV files. AI will automatically extract game details, venues, and timing information.'
  };

  const handleSmartImport = (importedData: any[]) => {
    const newGames: Game[] = importedData.map((item, index) => ({
      id: `imported-${Date.now()}-${index}`,
      opponent: item.opponent || item.team || item.vs || 'TBD',
      venue: item.venue || item.location || item.stadium || 'TBD',
      venueAddress: item.venue_address || item.address || '',
      gameDate: item.date || item.game_date || new Date().toISOString().split('T')[0],
      gameTime: item.time || item.start_time || '19:00',
      loadInTime: item.load_in_time || item.arrival_time || '17:00',
      status: 'scheduled' as const,
      isHome: item.home_away ? item.home_away.toLowerCase().includes('home') : true
    }));

    setGames(prev => [...prev, ...newGames]);
  };

  const [games, setGames] = useState<Game[]>([
    {
      id: '1',
      opponent: 'Phoenix Suns',
      venue: 'Crypto.com Arena',
      venueAddress: '1111 S Figueroa St, Los Angeles, CA',
      gameDate: '2025-01-20',
      gameTime: '19:30',
      loadInTime: '15:00',
      status: 'confirmed',
      isHome: true
    },
    {
      id: '2',
      opponent: 'Golden State Warriors',
      venue: 'Chase Center',
      venueAddress: '1 Warriors Way, San Francisco, CA',
      gameDate: '2025-01-25',
      gameTime: '20:00',
      loadInTime: '16:00',
      status: 'scheduled',
      isHome: false
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy size={24} className="text-glass-orange" />
          Game Schedule
        </h3>
        <button className="bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
          <Plus size={16} />
          Add Game
        </button>
      </div>

      {/* Smart Import Component */}
      <SmartImport
        targetCollection="games"
        parseConfig={parseConfig}
        onDataImported={handleSmartImport}
        className="mb-6"
      />

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="space-y-4">
          {games.map((game) => (
            <div key={game.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    game.status === 'confirmed' ? 'bg-green-400' :
                    game.status === 'scheduled' ? 'bg-yellow-400' :
                    game.status === 'completed' ? 'bg-blue-400' : 'bg-red-400'
                  }`} />
                  <h4 className="text-white font-medium">
                    {game.isHome ? 'vs' : '@'} {game.opponent}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    game.isHome 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {game.isHome ? 'HOME' : 'AWAY'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="text-glass-orange hover:text-glass-orange/80 text-sm">Edit</button>
                  <button className="text-red-400 hover:text-red-300 text-sm">Cancel</button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar size={14} />
                  {game.gameDate} at {game.gameTime}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin size={14} />
                  {game.venue}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  Load-in: {game.loadInTime}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
