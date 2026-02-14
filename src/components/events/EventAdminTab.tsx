import React from 'react';
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
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEventAdmin } from '@/hooks/useEventAdmin';

interface EventAdminTabProps {
  eventId: string;
}

const TAB_META: { id: string; label: string; icon: React.ElementType; alwaysOn?: boolean }[] = [
  { id: 'agenda', label: 'Agenda', icon: Calendar, alwaysOn: true },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'lineup', label: 'Line-up', icon: Users },
  { id: 'media', label: 'Media', icon: Camera },
  { id: 'polls', label: 'Polls', icon: BarChart3 },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
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
    toggleVisibility,
    toggleFeature,
    isFeatureEnabled,
    approveRequest,
    rejectRequest,
  } = useEventAdmin({ eventId });

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

  /* Fixed height for Tabs and Attendees cards so they match (~10 rows visible) */
  const CARD_MIN_HEIGHT = 'min-h-[320px]';

  return (
    <div className="p-4 w-full">
      {/* Header: left-aligned, positioned underneath admin tab */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <Shield size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage your event settings</p>
        </div>
      </div>

      {/* Two-column layout: left (Visibility + Tabs), right (Permissions + Attendees) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Event Visibility */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Event Visibility
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPrivate ? (
                  <Lock size={18} className="text-amber-400" />
                ) : (
                  <Globe size={18} className="text-emerald-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isPrivate ? 'Private' : 'Public'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPrivate
                      ? 'Join requests must be approved by an organizer'
                      : 'Anyone with the link can join instantly'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={toggleVisibility}
                disabled={isSaving}
                aria-label="Toggle event visibility"
              />
            </div>
          </div>

          {/* Tabs */}
          <div
            className={`rounded-2xl border border-border bg-card p-5 space-y-4 flex flex-col ${CARD_MIN_HEIGHT}`}
          >
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Tabs</h3>
            <div className="space-y-3">
              {TAB_META.map(tab => {
                const Icon = tab.icon;
                const enabled = isFeatureEnabled(tab.id);
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
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleFeature(tab.id)}
                      disabled={tab.alwaysOn || isSaving}
                      aria-label={`Toggle ${tab.label}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Permissions */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 opacity-60">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Permissions
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                Coming Soon
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">
                  Chat mode: Broadcast-only (Free) / Full chat (Pro)
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">
                  Media uploads: Admin-only (Free) / All attendees (Pro)
                </span>
              </div>
            </div>
          </div>

          {/* Attendees: same size as Tabs, ~10 names visible with scroll */}
          <div
            className={`rounded-2xl border border-border bg-card p-5 space-y-4 flex flex-col ${CARD_MIN_HEIGHT}`}
          >
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Attendees
              </h3>
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
                {memberCount}
              </span>
            </div>

            {/* Member list: ~10 visible, scroll for more */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
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

                  {/* Join Requests (only when private) */}
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
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => rejectRequest(req.id)}
                              disabled={isProcessing}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              aria-label="Deny"
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
      </div>
    </div>
  );
};
