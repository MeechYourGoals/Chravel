import React, { useState } from 'react';
import { Users, User, Share, Link } from 'lucide-react';
import { Button } from '../ui/button';
import { useInviteLink } from '../../hooks/useInviteLink';
import { InviteLinkSection } from '../invite/InviteLinkSection';
import { ShareOptionsSection } from '../invite/ShareOptionsSection';
import { InviteInstructions } from '../invite/InviteInstructions';
import { EventAttendee, RSVPStatus } from '../../types/events';

export const SimpleAttendeeSection = () => {
  const [attendees, setAttendees] = useState<EventAttendee[]>([
    { id: '1', name: 'John Smith', email: 'john@example.com', status: 'going', rsvpedAt: '2024-01-15' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', status: 'maybe', rsvpedAt: '2024-01-14' },
    { id: '3', name: 'Mike Davis', email: 'mike@example.com', status: 'going', rsvpedAt: '2024-01-13' },
    { id: '4', name: 'Alex Kim', email: 'alex@example.com', status: 'not-going', rsvpedAt: '2024-01-12' },
    { id: '5', name: 'Jamie Wilson', email: 'jamie@example.com', status: 'not-answered' },
    { id: '6', name: 'Chris Brown', email: 'chris@example.com', status: 'not-answered' }
  ]);
  
  const [showFilters, setShowFilters] = useState<RSVPStatus[]>(['going', 'maybe', 'not-going', 'not-answered']);
  const [eventId] = useState('event-123'); // This would come from props in real implementation
  
  const {
    copied,
    inviteLink,
    loading,
    regenerateInviteToken,
    handleCopyLink,
    handleShare,
    handleEmailInvite,
    handleSMSInvite
  } = useInviteLink({ 
    isOpen: true, 
    tripName: 'My Amazing Event', 
    requireApproval: false, 
    expireIn7Days: false,
    tripId: eventId
  });

  // Calculate summary counts
  const goingCount = attendees.filter(a => a.status === 'going').length;
  const maybeCount = attendees.filter(a => a.status === 'maybe').length;
  const notGoingCount = attendees.filter(a => a.status === 'not-going').length;
  const notAnsweredCount = attendees.filter(a => a.status === 'not-answered').length;

  // Filter attendees based on selected filters
  const filteredAttendees = attendees.filter(a => showFilters.includes(a.status));

  // Group attendees by status
  const groupedAttendees = {
    going: attendees.filter(a => a.status === 'going'),
    maybe: attendees.filter(a => a.status === 'maybe'),
    'not-going': attendees.filter(a => a.status === 'not-going'),
    'not-answered': attendees.filter(a => a.status === 'not-answered')
  };

  const getStatusConfig = (status: RSVPStatus) => {
    switch (status) {
      case 'going':
        return { label: 'Going', bgColor: 'bg-green-500/20', textColor: 'text-green-400', icon: '✓' };
      case 'maybe':
        return { label: 'Maybe', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', icon: '?' };
      case 'not-going':
        return { label: 'Not Going', bgColor: 'bg-red-500/20', textColor: 'text-red-400', icon: '✗' };
      case 'not-answered':
        return { label: 'Not Answered', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400', icon: '–' };
    }
  };

  const toggleFilter = (status: RSVPStatus) => {
    setShowFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={24} className="text-glass-orange" />
          RSVP Management
        </h3>
        <p className="text-gray-300 mt-2">Share your event link and track RSVPs in real-time</p>
      </div>

      {/* Fixed Summary Bar - Always Visible */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-white mb-3">RSVP Summary</h4>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-medium">
            {goingCount} Going
          </span>
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-medium">
            {maybeCount} Maybe
          </span>
          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-medium">
            {notGoingCount} Not Going
          </span>
          <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full font-medium">
            {notAnsweredCount} Not Answered
          </span>
          <span className="text-white font-medium ml-2">
            • {attendees.length} Total Invites
          </span>
        </div>
      </div>

      {/* Invite Link Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link size={20} className="text-glass-orange" />
          <h4 className="text-base font-semibold text-white">Share Event Invite</h4>
        </div>
        <p className="text-gray-300 text-sm mb-3">
          Share this link with your guests so they can RSVP to your event
        </p>
        
        <InviteLinkSection
          inviteLink={inviteLink}
          loading={loading}
          copied={copied}
          onCopyLink={handleCopyLink}
          onRegenerate={regenerateInviteToken}
        />
        
        <ShareOptionsSection
          loading={loading}
          inviteLink={inviteLink}
          onShare={handleShare}
          onEmailInvite={handleEmailInvite}
          onSMSInvite={handleSMSInvite}
        />
        
        <InviteInstructions />
      </div>

      {/* RSVP Status Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-white">
            RSVP Responses ({attendees.length} total)
          </h4>
          <div className="flex gap-2">
            {(['going', 'maybe', 'not-going', 'not-answered'] as RSVPStatus[]).map((status) => {
              const config = getStatusConfig(status);
              const isActive = showFilters.includes(status);
              return (
                <Button
                  key={status}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFilter(status)}
                  className={`text-xs ${isActive ? config.bgColor + ' ' + config.textColor : 'text-gray-400'}`}
                >
                  {config.icon} {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Grouped RSVP List */}
        <div className="space-y-4">
          {(['going', 'maybe', 'not-going', 'not-answered'] as RSVPStatus[]).map((status) => {
            const statusAttendees = groupedAttendees[status];
            const config = getStatusConfig(status);
            
            if (!showFilters.includes(status) || statusAttendees.length === 0) return null;
            
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${config.bgColor.replace('/20', '')}`}></span>
                  <h5 className={`font-medium ${config.textColor}`}>
                    {config.label} ({statusAttendees.length})
                  </h5>
                </div>
                
                <div className="space-y-2 pl-5">
                  {statusAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <User size={16} className="text-glass-orange" />
                        <div>
                          <p className="text-white font-medium text-sm">{attendee.name}</p>
                          <p className="text-gray-400 text-xs">{attendee.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                          {config.icon} {config.label}
                        </span>
                        {attendee.rsvpedAt && (
                          <span className="text-gray-500 text-xs">
                            {new Date(attendee.rsvpedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredAttendees.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No RSVPs match your current filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};