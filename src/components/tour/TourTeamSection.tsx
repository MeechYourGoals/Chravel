import React from 'react';
import { Plus } from 'lucide-react';
import { Tour } from '../../types/pro';

interface TourTeamSectionProps {
  tour: Tour;
}

export const TourTeamSection = ({ tour }: TourTeamSectionProps) => {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Team</h2>
        <button className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2">
          <Plus size={16} />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tour.teamMembers.map(member => (
          <div
            key={member.id}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-glass-green/30 to-glass-yellow/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">{member.name.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-medium truncate">{member.name}</div>
                <div className="text-gray-400 text-xs capitalize">
                  {member.role.replace('-', ' ')}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  member.permissions === 'admin'
                    ? 'bg-red-500/20 text-red-400'
                    : member.permissions === 'editor'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {member.permissions}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-400' : 'bg-gray-500'}`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
