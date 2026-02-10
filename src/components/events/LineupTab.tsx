import React, { useState, useCallback } from 'react';
import { Search, Users, X, Mic, Calendar, Plus, Edit2, Trash2, Clock, MapPin } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../mobile/PullToRefreshIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useEventLineup } from '@/hooks/useEventLineup';
import type { Speaker, EventAgendaItem } from '../../types/events';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { format, parseISO } from 'date-fns';

interface LineupPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface LineupTabProps {
  eventId: string;
  permissions: LineupPermissions;
  agendaSessions?: EventAgendaItem[];
  initialSpeakers?: Speaker[];
}

export const LineupTab = ({ eventId, permissions, agendaSessions = [], initialSpeakers = [] }: LineupTabProps) => {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  const { members, addMember, updateMember, deleteMember } = useEventLineup({ eventId, initialMembers: initialSpeakers });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['event-lineup', eventId] });
  }, [queryClient, eventId]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  const canCreate = isDemoMode || permissions.canCreate;
  const canEdit = isDemoMode || permissions.canEdit;
  const canDelete = isDemoMode || permissions.canDelete;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Speaker | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ name: '', title: '', company: '', bio: '' });
  const [editMember, setEditMember] = useState({ name: '', title: '', company: '', bio: '' });

  const filteredMembers = members.filter(speaker =>
    speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    speaker.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    speaker.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find agenda sessions for a given speaker name
  const getSessionsForMember = (memberName: string): EventAgendaItem[] => {
    return agendaSessions.filter(session =>
      session.speakers?.some(s => s.toLowerCase() === memberName.toLowerCase())
    );
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim()) return;
    try {
      await addMember({
        name: newMember.name.trim(),
        title: newMember.title.trim() || undefined,
        company: newMember.company.trim() || undefined,
        bio: newMember.bio.trim() || undefined,
      });
      setNewMember({ name: '', title: '', company: '', bio: '' });
      setIsAddingMember(false);
    } catch {
      // Error handled by hook toast
    }
  };

  const handleEditMember = (speaker: Speaker) => {
    if (!canEdit) return;
    setEditingMemberId(speaker.id);
    setEditMember({
      name: speaker.name,
      title: speaker.title || '',
      company: speaker.company || '',
      bio: speaker.bio || ''
    });
  };

  const handleUpdateMember = async (speakerId: string) => {
    if (!editMember.name.trim()) return;
    try {
      await updateMember({
        id: speakerId,
        name: editMember.name.trim(),
        title: editMember.title.trim() || undefined,
        company: editMember.company.trim() || undefined,
        bio: editMember.bio.trim() || undefined,
      });
      setEditingMemberId(null);
    } catch {
      // Error handled by hook toast
    }
  };

  const handleDeleteMember = async (speakerId: string) => {
    if (!canDelete) return;
    try {
      await deleteMember(speakerId);
    } catch {
      // Error handled by hook toast
    }
  };

  const memberSessions = selectedMember ? getSessionsForMember(selectedMember.name) : [];

  return (
    <div className="relative p-4 space-y-4">
      {(isRefreshing || pullDistance > 0) && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-yellow-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">Line-up</h2>
            <p className="text-gray-400 text-sm">
              {canCreate ? 'Manage speakers, artists, and presenters' : 'Speakers, artists, and presenters at this event'}
            </p>
          </div>
        </div>
        {canCreate && !isAddingMember && (
          <Button onClick={() => setIsAddingMember(true)} className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold">
            <Plus size={16} className="mr-2" />
            Add to Line-up
          </Button>
        )}
      </div>

      {/* Add Member Form */}
      {isAddingMember && canCreate && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-white">Add to Line-up</h3>
              <Button onClick={() => { setIsAddingMember(false); setNewMember({ name: '', title: '', company: '', bio: '' }); }} variant="ghost" size="sm">Cancel</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={newMember.name} onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))} placeholder="Name *" className="bg-gray-900 border-gray-700 text-white" />
              <Input value={newMember.title} onChange={(e) => setNewMember(prev => ({ ...prev, title: e.target.value }))} placeholder="Title (e.g., CEO, Keynote Speaker)" className="bg-gray-900 border-gray-700 text-white" />
              <Input value={newMember.company} onChange={(e) => setNewMember(prev => ({ ...prev, company: e.target.value }))} placeholder="Company/Organization" className="bg-gray-900 border-gray-700 text-white md:col-span-2" />
            </div>
            <Textarea value={newMember.bio} onChange={(e) => setNewMember(prev => ({ ...prev, bio: e.target.value }))} placeholder="Bio (optional)" className="bg-gray-900 border-gray-700 text-white" rows={2} />
            <div className="flex gap-2 justify-end">
              <Button onClick={() => { setIsAddingMember(false); setNewMember({ name: '', title: '', company: '', bio: '' }); }} variant="ghost">Cancel</Button>
              <Button onClick={handleAddMember} className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold">Add to Line-up</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, title, or company..." className="pl-10 bg-gray-800/50 border-gray-700 text-white" />
      </div>

      {/* Speakers Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(speaker => (
            <Card 
              key={speaker.id} 
              className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer relative group"
              onClick={() => setSelectedMember(speaker)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {speaker.avatar ? (
                      <img src={speaker.avatar} alt={speaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <Mic size={20} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{speaker.name}</h3>
                    {speaker.title && <p className="text-gray-400 text-sm truncate">{speaker.title}</p>}
                    {speaker.company && <p className="text-yellow-500 text-xs truncate">{speaker.company}</p>}
                  </div>
                </div>
                {/* Admin controls overlay */}
                {(canEdit || canDelete) && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <Button onClick={(e) => { e.stopPropagation(); handleEditMember(speaker); }} variant="ghost" size="icon" className="h-7 w-7 bg-gray-900/80 text-gray-400 hover:text-white">
                        <Edit2 size={12} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button onClick={(e) => { e.stopPropagation(); handleDeleteMember(speaker.id); }} variant="ghost" size="icon" className="h-7 w-7 bg-gray-900/80 text-red-400 hover:text-red-300">
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-12 text-center">
            <Users size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Line-up Yet</h3>
            <p className="text-gray-400 mb-4">
              {canCreate ? 'Add speakers, artists, or presenters to your event line-up' : 'Speakers and performers will be announced soon'}
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

      {/* Edit Member Modal */}
      {editingMemberId && canEdit && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditingMemberId(null)}>
          <Card className="bg-gray-900 border-gray-700 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Edit Line-up Member</h3>
                <Button onClick={() => setEditingMemberId(null)} variant="ghost" size="sm"><X size={20} /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={editMember.name} onChange={(e) => setEditMember(prev => ({ ...prev, name: e.target.value }))} placeholder="Name *" className="bg-gray-800 border-gray-700 text-white" />
                <Input value={editMember.title} onChange={(e) => setEditMember(prev => ({ ...prev, title: e.target.value }))} placeholder="Title" className="bg-gray-800 border-gray-700 text-white" />
                <Input value={editMember.company} onChange={(e) => setEditMember(prev => ({ ...prev, company: e.target.value }))} placeholder="Company/Organization" className="bg-gray-800 border-gray-700 text-white md:col-span-2" />
              </div>
              <Textarea value={editMember.bio} onChange={(e) => setEditMember(prev => ({ ...prev, bio: e.target.value }))} placeholder="Bio (optional)" className="bg-gray-800 border-gray-700 text-white" rows={3} />
              <div className="flex gap-2 justify-end">
                <Button onClick={() => setEditingMemberId(null)} variant="ghost">Cancel</Button>
                <Button onClick={() => handleUpdateMember(editingMemberId)} className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Read-Only Speaker Session Detail Modal */}
      <Dialog open={!!selectedMember && !editingMemberId} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedMember.avatar ? (
                      <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
                    ) : (
                      <Mic size={28} className="text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl text-white">{selectedMember.name}</DialogTitle>
                    {selectedMember.title && <p className="text-gray-400 mt-1">{selectedMember.title}</p>}
                    {selectedMember.company && <p className="text-yellow-500 text-sm">{selectedMember.company}</p>}
                  </div>
                </div>
              </DialogHeader>

              {selectedMember.bio && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">About</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedMember.bio}</p>
                </div>
              )}

              {/* Sessions Section */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Calendar size={14} />
                  Sessions ({memberSessions.length})
                </h4>
                {memberSessions.length > 0 ? (
                  <div className="space-y-3">
                    {memberSessions.map(session => (
                      <Card key={session.id} className="bg-gray-800/60 border-gray-700">
                        <CardContent className="p-3">
                          {session.track && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs mb-2 inline-block">
                              {session.track}
                            </span>
                          )}
                          <h5 className="text-white font-medium text-sm">{session.title}</h5>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {session.session_date && (() => {
                                try { return format(parseISO(session.session_date), 'MMM d') + ' — '; }
                                catch { return ''; }
                              })()}
                              {session.start_time}
                              {session.end_time && ` - ${session.end_time}`}
                            </span>
                            {session.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {session.location}
                              </span>
                            )}
                          </div>
                          {session.description && (
                            <p className="text-gray-500 text-xs mt-2 line-clamp-2">{session.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-800/40 border-gray-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-gray-500 text-sm">No scheduled sessions</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
