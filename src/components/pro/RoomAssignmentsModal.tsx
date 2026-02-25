import React, { useState } from 'react';
import { X, Home, Users, Calendar, MapPin } from 'lucide-react';
import { RoomAssignment, ProParticipant } from '../../types/pro';

interface RoomAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomAssignments: RoomAssignment[];
  roster: ProParticipant[];
  onUpdateAssignments: (assignments: RoomAssignment[]) => void;
}

export const RoomAssignmentsModal = ({
  isOpen,
  onClose,
  roomAssignments,
  roster,
  onUpdateAssignments,
}: RoomAssignmentsModalProps) => {
  const [assignments, setAssignments] = useState<RoomAssignment[]>(roomAssignments);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateAssignments(assignments);
    onClose();
  };

  const getParticipantName = (id: string) => {
    const participant = roster.find(p => p.id === id);
    return participant?.name || 'Unknown';
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'suite':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'single':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'double':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Home className="text-red-400" size={24} />
            <h2 className="text-xl font-bold text-white">Room Assignments</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assignments.map(assignment => (
              <div
                key={assignment.id}
                className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium">{assignment.room}</h3>
                    <p className="text-gray-400 text-sm">{assignment.hotel}</p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-lg border text-xs font-medium ${getRoomTypeColor(assignment.roomType)}`}
                  >
                    {assignment.roomType}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Occupants */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className="text-gray-400" />
                      <span className="text-gray-400 text-sm">
                        Occupants ({assignment.occupants.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {assignment.occupants.map(occupantId => (
                        <div key={occupantId} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-white">{getParticipantName(occupantId)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Check-in/Check-out */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-gray-400 text-xs">Check-in</span>
                      </div>
                      <p className="text-white text-sm">
                        {new Date(assignment.checkIn).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-gray-400 text-xs">Check-out</span>
                      </div>
                      <p className="text-white text-sm">
                        {new Date(assignment.checkOut).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Special Requests */}
                  {assignment.specialRequests && assignment.specialRequests.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Special Requests:</p>
                      <div className="flex flex-wrap gap-1">
                        {assignment.specialRequests.map((request, index) => (
                          <span
                            key={index}
                            className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs"
                          >
                            {request}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
