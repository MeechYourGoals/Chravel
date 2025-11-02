# Channels Feature Documentation

## Overview

The Channels feature provides role-based private communication channels for Enterprise and Pro trips, similar to Slack's channel system. This feature allows team members to have focused discussions based on their roles and responsibilities.

## Features

### Core Functionality
- **Role-based Channels**: Automatically created channels for specific roles (e.g., Coaches, Players, Medical Staff)
- **Custom Channels**: Admin-created channels for specific purposes (e.g., Security Team, Venue Contacts)
- **Real-time Messaging**: Live chat with typing indicators, read receipts, and message reactions
- **Member Management**: Add/remove members, view member lists, manage permissions
- **Channel Organization**: Filter by channel type, search channels, archive inactive channels

### Security & Access Control
- **Row Level Security (RLS)**: Database-level security ensuring users can only access channels they're members of
- **Role-based Permissions**: Different permission levels for admins vs regular members
- **Private Channels**: Messages are only visible to channel members
- **Audit Trail**: All channel activities are logged for compliance

## Architecture

### Database Schema

#### Tables
- `trip_channels`: Stores channel metadata
- `trip_channel_members`: Manages channel membership
- `trip_chat_messages`: Extended to support channel messages (via `channel_id`)

#### Key Fields
```sql
trip_channels:
- id: UUID (primary key)
- trip_id: TEXT (foreign key to trips)
- name: TEXT (channel name)
- slug: TEXT (URL-friendly identifier)
- channel_type: ENUM ('role', 'custom')
- role_filter: JSONB (for role channels)
- created_by: UUID (user who created)
- is_archived: BOOLEAN

trip_channel_members:
- channel_id: UUID (foreign key)
- user_id: UUID (foreign key)
- role: TEXT (display role in channel)
- joined_at: TIMESTAMPTZ

trip_chat_messages:
- channel_id: UUID (nullable, NULL = main chat)
- ... (existing message fields)
```

### Service Layer

#### ChannelService
- `getChannels(tripId, filters?)`: List channels for a trip
- `createChannel(request)`: Create new channel
- `updateChannel(channelId, updates)`: Update channel settings
- `archiveChannel(channelId)`: Archive a channel
- `getChannelMembers(channelId)`: Get channel members
- `addMembers(channelId, userIds)`: Add users to channel
- `removeMember(channelId, userId)`: Remove user from channel
- `sendMessage(input)`: Send message to channel
- `subscribeToChannelMessages(channelId, handlers)`: Real-time subscription

#### UnifiedMessagingService Updates
- Extended to support `channelId` parameter
- Maintains backward compatibility with main chat
- Real-time subscriptions filter by channel

### UI Components

#### Core Components
- `ChannelsPanel`: Main channels workspace with sidebar and content area
- `ChannelMessagePane`: Message display and composition
- `NewChannelModal`: Channel creation interface
- `ChannelMembersModal`: Member management interface

#### Hooks
- `useChannels(tripId)`: Channel management with React Query
- `useChannelMessages(channelId)`: Message handling with real-time updates
- `useFeatureFlags()`: Feature flag management

## Usage

### For Administrators

#### Creating Role Channels
Role channels are automatically created when:
1. A new Pro/Enterprise trip is created
2. New roles are added to the team roster
3. The `create-default-channels` edge function is triggered

#### Creating Custom Channels
1. Navigate to Team tab → Channels view
2. Click "New Channel" button
3. Choose "Custom Channel"
4. Enter channel name and description
5. Add members manually

#### Managing Members
1. Click on a channel to open it
2. Click "Manage Members" button
3. Add/remove members as needed
4. View member roles and join dates

### For Team Members

#### Accessing Channels
1. Navigate to Team tab
2. Click "Channels" in the view toggle
3. Select a channel from the sidebar
4. Start messaging

#### Channel Types
- **Role Channels**: Automatically include all users with specific roles
- **Custom Channels**: Manually managed membership

### Mobile Support

The channels feature is fully responsive and works on mobile devices with:
- Touch-optimized interface
- Swipe gestures for navigation
- Mobile-specific message composition
- Offline message queuing

## Configuration

### Feature Flags

Environment variables control channel availability:

```bash
VITE_CHANNELS_ENABLED=true          # Enable/disable channels
VITE_CHANNELS_PRO_ONLY=true         # Pro/Enterprise only
VITE_CHANNELS_EVENTS_ONLY=false     # Events only
VITE_CHANNELS_AUTO_CREATE=true      # Auto-create role channels
```

### Auto-Creation Settings

Role channels are automatically created for:
- Sports teams: Coaches, Players, Medical Staff, Security
- Music tours: Artists, Crew, Security, Venue Contacts
- Corporate events: Organizers, Staff, Security, Vendors

## Security Considerations

### Row Level Security Policies

1. **Channel Access**: Users can only see channels they're members of
2. **Message Access**: Messages are only visible to channel members
3. **Admin Override**: Trip admins can manage all channels
4. **Audit Trail**: All actions are logged with user attribution

### Permission Levels

- **Trip Admin**: Full channel management, can create/delete channels
- **Channel Member**: Can send messages, view channel content
- **Non-Member**: Cannot see channel or messages

## Performance

### Optimization Strategies

1. **Message Pagination**: Load messages in batches of 50
2. **Virtual Scrolling**: Efficient rendering of large message lists
3. **Real-time Subscriptions**: Only subscribe to active channels
4. **Caching**: React Query for efficient data management
5. **Offline Support**: Queue messages when offline

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_trip_channels_trip_id ON trip_channels(trip_id);
CREATE INDEX idx_trip_channel_members_channel_id ON trip_channel_members(channel_id);
CREATE INDEX idx_trip_chat_messages_channel_id ON trip_chat_messages(channel_id);
CREATE INDEX idx_trip_chat_messages_trip_channel ON trip_chat_messages(trip_id, channel_id, created_at);
```

## Troubleshooting

### Common Issues

1. **Channels not visible**: Check user permissions and trip membership
2. **Messages not loading**: Verify channel membership and RLS policies
3. **Real-time not working**: Check WebSocket connection and subscriptions
4. **Mobile issues**: Ensure responsive design and touch events

### Debug Steps

1. Check browser console for errors
2. Verify user authentication status
3. Confirm trip membership and role
4. Test with different user accounts
5. Check database RLS policies

## Future Enhancements

### Planned Features
- Channel archiving and search
- Message threading and replies
- File sharing in channels
- Voice messages and video calls
- Channel templates and automation
- Advanced moderation tools
- Analytics and reporting

### Integration Opportunities
- Slack/Teams webhook integration
- Email notifications for mentions
- Calendar integration for channel events
- Third-party app integrations
- API for external channel management

## Support

For technical support or feature requests:
1. Check this documentation first
2. Review the codebase in `src/components/pro/channels/`
3. Test with the provided examples
4. Contact the development team for advanced issues

## Examples

### Sports Team Use Case
```
Channels:
- #coaches (Head Coach, Assistant Coaches)
- #players (All team players)
- #medical (Medical staff, trainers)
- #security (Security team)
- #venue-contacts (Venue coordinators)
```

### Music Tour Use Case
```
Channels:
- #artists (Main performers)
- #crew (Technical crew, roadies)
- #security (Security team)
- #venue-contacts (Venue staff)
- #logistics (Tour managers, coordinators)
```

### Corporate Event Use Case
```
Channels:
- #organizers (Event organizers)
- #staff (Event staff)
- #security (Security team)
- #vendors (External vendors)
- #speakers (Keynote speakers)
```
