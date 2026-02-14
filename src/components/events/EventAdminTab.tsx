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
import { EVENT_TABS_CONFIG } from '@/lib/eventTabs';

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

const TAB_META = EVENT_TABS_CONFIG.filter(tab => tab.key !== 'admin').map(tab => ({
  id: tab.key,
  label: tab.label,
  icon: TAB_ICON_MAP[tab.key],
  alwaysOn: tab.alwaysOn,
}));

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

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Shield size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage your event settings</p>
        </div>
      </div>

      {/* Section 1: Event Visibility */}
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

      {/* Section 2: Tab Toggles */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
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

      {/* Section 3: Attendees + Join Requests */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Attendees
          </h3>
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
            {memberCount}
          </span>
        </div>

        {/* Member list */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No attendees yet</p>
          ) : (
            members.map(member => (
              <div key={member.user_id} className="flex items-center gap-3 py-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {(member.display_name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground truncate">
                  {member.display_name || 'Member'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Join Requests (only when private) */}
        {isPrivate && joinRequests.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              Pending Requests ({joinRequests.length})
            </h4>
            {joinRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={req.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {(req.profile?.display_name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground truncate">
                    {req.profile?.display_name || 'Someone'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
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
      </div>

      {/* Section 4: Permissions (placeholder) */}
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
    </div>
  );
};
