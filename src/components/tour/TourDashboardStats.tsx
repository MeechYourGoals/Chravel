import React from 'react';
import { Tour } from '../../types/pro';

interface TourDashboardStatsProps {
  tour: Tour;
}

export const TourDashboardStats = ({ tour }: TourDashboardStatsProps) => {
  // Calculate upcoming events (current date or future)
  const today = new Date();
  const upcomingEvents = tour.trips.filter(trip => new Date(trip.date) >= today).length;

  // Calculate total unique team members across all trips
  const allTeamMembers = new Set();
  tour.teamMembers.forEach(member => allTeamMembers.add(member.id));
  tour.trips.forEach(trip => {
    trip.participants.forEach(participant => allTeamMembers.add(participant.id));
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6">
        <div className="text-xl md:text-2xl font-bold text-white mb-1">{tour.trips.length}</div>
        <div className="text-gray-400 text-xs md:text-sm">Total Events</div>
      </div>
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6">
        <div className="text-xl md:text-2xl font-bold text-glass-green mb-1">{upcomingEvents}</div>
        <div className="text-gray-400 text-xs md:text-sm">Upcoming</div>
      </div>
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6">
        <div className="text-xl md:text-2xl font-bold text-glass-yellow mb-1">
          {allTeamMembers.size}
        </div>
        <div className="text-gray-400 text-xs md:text-sm">Total Team Members</div>
      </div>
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6">
        <div className="text-xl md:text-2xl font-bold text-white mb-1">
          {tour.teamMembers.filter(m => m.isActive).length}
        </div>
        <div className="text-gray-400 text-xs md:text-sm">Active Team</div>
      </div>
    </div>
  );
};
