import React, { useState } from 'react';
import {
  Shield,
  Globe,
  Lock,
  Calendar,
  MessageCircle,
  Users,
  Camera,
  BarChart3,
  ClipboardList,
  Check,
  X,
  Settings2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useEventAdmin, ChatMode, MediaUploadMode } from '@/hooks/useEventAdmin';
import { EVENT_TABS_CONFIG } from '@/lib/eventTabs';
import { NativeSegmentedControl } from '@/components/native/NativeSegmentedControl';

interface EventAdminTabProps {
  eventId: string;
}

const TAB_ICON_MAP: Record<string, React.ElementType> = {
  agenda: Calendar,
  calendar: Calendar,
  chat: MessageCircle,
  lineup: Users,
  media: Camera,
  polls: BarChart3,
  tasks: ClipboardList,
};

const TABS_WITH_GEAR = new Set(['chat', 'media']);

const TAB_META = EVENT_TABS_CONFIG.filter(tab => tab.key !== 'admin').map(tab => ({
  id: tab.key,
  label: tab.label,
  icon: TAB_ICON_MAP[tab.key],
  alwaysOn: tab.alwaysOn,
}));

const VISIBILITY_SEGMENTS = [
  { id: 'public', label: 'Public', icon: <Globe size={14} /> },
  { id: 'private', label: 'Private', icon: <Lock size={14} /> },
];

export const EventAdminTab: React.FC<EventAdminTabProps> = ({ eventId }) => {
  const {
    isPrivate,
    members,
    memberCount,
    joinRequests,
    isLoading,
    isSaving,
    isProcessing,
    chatMode,
    mediaUploadMode,
    toggleVisibility,
    toggleFeature,
    isFeatureEnabled,
    setChatMode,
    setMediaUploadMode,
    approveRequest,
    rejectRequest,
  } = useEventAdmin({ eventId });

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [pendingChatMode, setPendingChatMode] = useState<ChatMode>(chatMode);
  const [pendingMediaMode, setPendingMediaMode] = useState<MediaUploadMode>(mediaUploadMode);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading admin settings...</p>
        </div>
      </div>
    );
  }

  const visibilityId = isPrivate ? 'private' : 'public';

  const handleVisibilityChange = (id: string) => {
    const wantPrivate = id === 'private';
    if (wantPrivate !== isPrivate) toggleVisibility();
  };

  const openChatModal = () => {
    setPendingChatMode(chatMode);
    setChatModalOpen(true);
  };

  const openMediaModal = () => {
    setPendingMediaMode(mediaUploadMode);
    setMediaModalOpen(true);
  };

  const saveChatMode = async () => {
    await setChatMode(pendingChatMode);
    setChatModalOpen(false);
  };

  const saveMediaMode = async () => {
    await setMediaUploadMode(pendingMediaMode);
    setMediaModalOpen(false);
  };

  return (
    <div className="p-4 w-full space-y-4">
      {/* Row 1: Admin Dashboard header + Visibility control (right-aligned) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Admin Dashboard header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
            <Shield size={22} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">Manage your event settings</p>
          </div>
        </div>

        {/* Right: Visibility control */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Visibility
            </span>
            <NativeSegmentedControl
              segments={VISIBILITY_SEGMENTS}
              selectedId={visibilityId}
              onChange={handleVisibilityChange}
              size="small"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPrivate ? 'Join requests required.' : 'Anyone with the link can join.'}
          </p>
        </div>
      </div>

      {/* Row 2: Tabs (left) + Attendees (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-h-[360px]">
        {/* Tabs card */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col h-full min-h-0">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex-shrink-0 mb-3">
            Tabs
          </h3>
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
            {TAB_META.map(tab => {
              const Icon = tab.icon;
              const enabled = isFeatureEnabled(tab.id);
              const hasGear = TABS_WITH_GEAR.has(tab.id);
              return (
                <div key={tab.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{tab.label}</span>
                    {tab.alwaysOn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        Always On
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasGear && (
                      <button
                        onClick={tab.id === 'chat' ? openChatModal : openMediaModal}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        aria-label={`${tab.label} permissions`}
                        title={`${tab.label} permissions`}
                      >
                        <Settings2 size={14} />
                      </button>
                    )}
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleFeature(tab.id)}
                      disabled={tab.alwaysOn || isSaving}
                      aria-label={`Toggle ${tab.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendees card */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between flex-shrink-0 mb-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Attendees
            </h3>
            <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
              {memberCount + (isPrivate ? joinRequests.length : 0)}
            </span>
          </div>

          <div className="overflow-y-auto space-y-2 max-h-[360px]">
            {members.length === 0 && (!isPrivate || joinRequests.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendees yet</p>
            ) : (
              <>
                {members.map(member => (
                  <div key={member.user_id} className="flex items-center gap-3 py-1.5">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {(member.display_name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground truncate">
                      {member.display_name || 'Member'}
                    </span>
                  </div>
                ))}

                {isPrivate && joinRequests.length > 0 && (
                  <div className="border-t border-border pt-3 mt-2 space-y-2">
                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                      Pending Requests ({joinRequests.length})
                    </h4>
                    {joinRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={req.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {(req.profile?.display_name || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground truncate">
                            {req.profile?.display_name || 'Someone'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => approveRequest(req.id)}
                            disabled={isProcessing}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            aria-label="Approve"
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => rejectRequest(req.id)}
                            disabled={isProcessing}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            aria-label="Deny"
                            title="Deny"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat permissions modal */}
      <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chat permissions</DialogTitle>
            <DialogDescription>
              Control who can send messages in this event's chat.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={pendingChatMode}
            onValueChange={v => setPendingChatMode(v as ChatMode)}
            className="space-y-4 py-2"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="broadcasts" id="chat-broadcasts" className="mt-1" />
              <Label htmlFor="chat-broadcasts" className="cursor-pointer space-y-1">
                <span className="font-medium text-foreground">Broadcasts only</span>
                <p className="text-xs text-muted-foreground">
                  Only admins can post broadcasts. Attendees can't send messages.
                </p>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="admin_only" id="chat-admin" className="mt-1" />
              <Label htmlFor="chat-admin" className="cursor-pointer space-y-1">
                <span className="font-medium text-foreground">Admin-only chat</span>
                <p className="text-xs text-muted-foreground">
                  Only admins can send messages. Attendees read-only.
                </p>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="everyone" id="chat-everyone" className="mt-1" />
              <Label htmlFor="chat-everyone" className="cursor-pointer space-y-1">
                <span className="font-medium text-foreground">Everyone can chat</span>
                <p className="text-xs text-muted-foreground">
                  All attendees can send messages.
                </p>
              </Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChatModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveChatMode} disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media permissions modal */}
      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Media upload permissions</DialogTitle>
            <DialogDescription>
              Control who can upload media in this event.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={pendingMediaMode}
            onValueChange={v => setPendingMediaMode(v as MediaUploadMode)}
            className="space-y-4 py-2"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="admin_only" id="media-admin" className="mt-1" />
              <Label htmlFor="media-admin" className="cursor-pointer space-y-1">
                <span className="font-medium text-foreground">Admins only</span>
                <p className="text-xs text-muted-foreground">
                  Only admins can upload media.
                </p>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="everyone" id="media-everyone" className="mt-1" />
              <Label htmlFor="media-everyone" className="cursor-pointer space-y-1">
                <span className="font-medium text-foreground">Everyone can upload</span>
                <p className="text-xs text-muted-foreground">
                  Any attendee can upload media.
                </p>
              </Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMediaModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMediaMode} disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
