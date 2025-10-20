import React, { useState, useEffect } from 'react';
import { Plus, Search, MessageCircle, Lock, Users } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import { useChannels } from '../../../hooks/useChannels';
import { ChannelWithStats } from '../../../types/channels';
import { NewChannelModal } from './NewChannelModal';
import { ChannelMessagePane } from './ChannelMessagePane';
import { ChannelMembersModal } from './ChannelMembersModal';

interface ChannelsPanelProps {
  tripId: string;
  userRole?: string;
  isAdmin?: boolean;
}

export const ChannelsPanel: React.FC<ChannelsPanelProps> = ({ 
  tripId, 
  userRole = 'staff',
  isAdmin = false 
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'role' | 'custom'>('all');
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const {
    channels,
    isLoading: loading,
    refetch: loadChannels
  } = useChannels(tripId);

  // Convert TripChannel to ChannelWithStats (add missing properties)
  const channelsWithStats: ChannelWithStats[] = (channels || []).map(channel => ({
    ...channel,
    stats: {
      channel_id: channel.id,
      member_count: 0,
      message_count: 0,
      unread_count: 0
    },
    member_count: 0,
    is_unread: false
  }));

  // Filter channels based on search and tab
  const filteredChannels = channelsWithStats.filter(channel => {
    const matchesSearch = !searchTerm ||
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'all' || channel.channel_type === activeTab;

    return matchesSearch && matchesTab;
  });

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!selectedChannel && filteredChannels.length > 0) {
      setSelectedChannel(filteredChannels[0].id);
    }
  }, [filteredChannels, selectedChannel]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
  };

  const handleChannelCreated = (channel: ChannelWithStats) => {
    setSelectedChannel(channel.id);
    setShowNewChannelModal(false);
    loadChannels();
  };

  const handleChannelUpdated = (updatedChannel: ChannelWithStats) => {
    loadChannels();
  };

  const handleChannelDeleted = (channelId: string) => {
    if (selectedChannel === channelId) {
      setSelectedChannel(filteredChannels.length > 1 ? filteredChannels[0].id : null);
    }
    loadChannels();
  };

  const getChannelIcon = (channel: ChannelWithStats) => {
    if (channel.channel_type === 'role') {
      return <Lock size={16} className="text-blue-400" />;
    }
    return <MessageCircle size={16} className="text-gray-400" />;
  };

  const getChannelTypeBadge = (channel: ChannelWithStats) => {
    if (channel.channel_type === 'role') {
      return <Badge variant="secondary" className="text-xs">Role</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Custom</Badge>;
  };

  const selectedChannelData = filteredChannels.find(c => c.id === selectedChannel);

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-80 border-r border-border bg-card/50 p-4">
          <div className="h-8 w-full bg-gray-700 rounded mb-4 animate-pulse"></div>
          <div className="h-10 w-full bg-gray-700 rounded mb-4 animate-pulse"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-gray-400">Loading channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-card/50 rounded-xl border border-border overflow-hidden">
      {/* Left Sidebar: Channel List */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Channels</h3>
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNewChannelModal(true)}
                className="text-primary hover:text-primary-foreground"
              >
                <Plus size={16} />
              </Button>
            )}
          </div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search channels..."
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'role' | 'custom')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="role" className="text-xs">Role</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChannels.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No channels found</p>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNewChannelModal(true)}
                  className="mt-4 border-primary text-primary hover:bg-primary/10"
                >
                  <Plus size={16} className="mr-2" />
                  Create your first channel
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChannel === channel.id
                      ? 'bg-primary/20 text-primary-foreground'
                      : 'hover:bg-white/10 text-gray-200'
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getChannelIcon(channel)}
                    <span className="font-medium truncate">{channel.name}</span>
                    {getChannelTypeBadge(channel)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                    {channel.member_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {channel.member_count}
                      </span>
                    )}
                    {channel.is_unread && (
                      <Badge variant="destructive" className="ml-1">New</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Channel Message Pane */}
      <div className="flex-1 flex flex-col">
        {selectedChannelData ? (
          <ChannelMessagePane
            channel={selectedChannelData}
            onChannelUpdate={handleChannelUpdated}
            onChannelDelete={handleChannelDeleted}
            onShowMembers={() => setShowMembersModal(true)}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a channel to start chatting</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewChannelModal && (
        <NewChannelModal
          tripId={tripId}
          onClose={() => setShowNewChannelModal(false)}
          onChannelCreated={handleChannelCreated}
        />
      )}

      {showMembersModal && selectedChannelData && (
        <ChannelMembersModal
          channel={selectedChannelData}
          onClose={() => setShowMembersModal(false)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};
