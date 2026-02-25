import React, { useState } from 'react';
import { Heart, Plus, Lock, AlertTriangle, Activity } from 'lucide-react';

export const WellnessLog = () => {
  const [entries] = useState([
    {
      id: '1',
      participantId: 'player-1',
      participantName: 'Marcus Johnson',
      date: '2025-01-15',
      type: 'injury' as const,
      description: 'Minor ankle sprain during practice',
      severity: 'minor' as const,
      status: 'active' as const,
      private: false,
    },
    {
      id: '2',
      participantId: 'player-2',
      participantName: 'Sarah Williams',
      date: '2025-01-14',
      type: 'treatment' as const,
      description: 'Physical therapy session for shoulder',
      severity: 'moderate' as const,
      status: 'resolved' as const,
      private: true,
    },
    {
      id: '3',
      participantId: 'player-3',
      participantName: 'David Chen',
      date: '2025-01-13',
      type: 'checkup' as const,
      description: 'Routine medical examination',
      severity: 'minor' as const,
      status: 'resolved' as const,
      private: false,
    },
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'injury':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'treatment':
        return <Activity size={16} className="text-blue-400" />;
      case 'checkup':
        return <Heart size={16} className="text-green-400" />;
      default:
        return <Heart size={16} className="text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor':
        return 'bg-green-500/20 text-green-400';
      case 'moderate':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'severe':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart size={24} className="text-glass-orange" />
          Wellness & Medical Log
        </h3>
        <button className="bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
          <Plus size={16} />
          Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{entries.length}</div>
          <div className="text-sm text-gray-400">Total Entries</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            {entries.filter(e => e.status === 'active').length}
          </div>
          <div className="text-sm text-gray-400">Active Cases</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {entries.filter(e => e.status === 'resolved').length}
          </div>
          <div className="text-sm text-gray-400">Resolved</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {entries.filter(e => e.private).length}
          </div>
          <div className="text-sm text-gray-400">Private Records</div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-blue-400 mb-2">
          <Lock size={16} />
          <span className="font-medium">Privacy & Compliance</span>
        </div>
        <p className="text-sm text-gray-300">
          All medical information is encrypted and access-controlled. Only authorized medical staff
          and designated team personnel can view sensitive health data. HIPAA compliance is
          maintained for all entries marked as private.
        </p>
      </div>

      {/* Wellness Entries */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Recent Entries</h4>
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getTypeIcon(entry.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-white font-medium">{entry.participantName}</h5>
                      {entry.private && <Lock size={14} className="text-yellow-400" />}
                    </div>
                    <p className="text-sm text-gray-400">{entry.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(entry.severity)}`}
                  >
                    {entry.severity.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      entry.status === 'active'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {entry.status.toUpperCase()}
                  </span>
                  <button className="text-glass-orange hover:text-glass-orange/80 text-sm">
                    Edit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-gray-400">
                  <span className="text-white">Date:</span> {entry.date}
                </div>
                <div className="text-gray-400">
                  <span className="text-white">Type:</span> {entry.type}
                </div>
                <div className="text-gray-400">
                  <span className="text-white">Access:</span>{' '}
                  {entry.private ? 'Private' : 'Team Visible'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors">
            <AlertTriangle size={20} className="text-red-400" />
            <div className="text-left">
              <div className="text-white font-medium">Report Injury</div>
              <div className="text-sm text-gray-400">Log new injury</div>
            </div>
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors">
            <Activity size={20} className="text-blue-400" />
            <div className="text-left">
              <div className="text-white font-medium">Treatment Update</div>
              <div className="text-sm text-gray-400">Update treatment progress</div>
            </div>
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-green-500/10 hover:bg-green-500/20 rounded-lg border border-green-500/20 transition-colors">
            <Heart size={20} className="text-green-400" />
            <div className="text-left">
              <div className="text-white font-medium">Schedule Checkup</div>
              <div className="text-sm text-gray-400">Book medical exam</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
