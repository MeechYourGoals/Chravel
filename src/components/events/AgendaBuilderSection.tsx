import React from 'react';
import { Clock, Plus, MapPin, Users } from 'lucide-react';

export const AgendaBuilderSection = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white">Multi-Track Agenda Builder</h3>

      {/* Track Configuration */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Track Configuration</h4>
        <div className="space-y-4">
          {['Main Stage', 'Innovation Lab', 'Networking Lounge', 'Workshop Room A'].map(
            (track, index) => (
              <div key={track} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Track Name</label>
                    <input
                      type="text"
                      defaultValue={track}
                      className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Location</label>
                    <input
                      type="text"
                      defaultValue={`Room ${index + 1}${index === 0 ? '01' : index === 1 ? '02' : index === 2 ? '03' : '04'}`}
                      className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Capacity</label>
                    <input
                      type="number"
                      defaultValue={
                        index === 0 ? '500' : index === 1 ? '100' : index === 2 ? '200' : '75'
                      }
                      className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Color</label>
                    <input
                      type="color"
                      defaultValue={
                        index === 0
                          ? '#ff6b35'
                          : index === 1
                            ? '#4a90e2'
                            : index === 2
                              ? '#50c878'
                              : '#9b59b6'
                      }
                      className="w-full h-10 bg-gray-800/50 border border-gray-600 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ),
          )}
          <button className="w-full bg-glass-orange/20 hover:bg-glass-orange/30 text-glass-orange border border-glass-orange/30 rounded-lg py-3 font-medium flex items-center justify-center gap-2">
            <Plus size={16} />
            Add New Track
          </button>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock size={20} />
            Session Schedule
          </span>
          <button className="bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <Plus size={16} />
            Add Session
          </button>
        </h4>
        <div className="space-y-4">
          {[
            {
              title: 'Opening Keynote',
              time: '09:00 - 10:00',
              track: 'Main Stage',
              speaker: 'Dr. Sarah Chen',
            },
            {
              title: 'AI Innovation Workshop',
              time: '10:30 - 12:00',
              track: 'Innovation Lab',
              speaker: 'Mike Johnson',
            },
            {
              title: 'Networking Coffee Break',
              time: '10:15 - 10:45',
              track: 'Networking Lounge',
              speaker: 'All Attendees',
            },
            {
              title: 'Future of Tech Panel',
              time: '13:00 - 14:00',
              track: 'Main Stage',
              speaker: 'Panel Discussion',
            },
          ].map((session, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-white font-medium">{session.title}</h5>
                <div className="flex gap-2">
                  <button className="text-glass-orange hover:text-glass-orange/80 text-sm">
                    Edit
                  </button>
                  <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  {session.time}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin size={14} />
                  {session.track}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Users size={14} />
                  {session.speaker}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
