# Media Share Integration Documentation

## Overview

The chat module now supports comprehensive media sharing with automatic categorization and real-time synchronization across web and mobile platforms.

## Features

### 1. Share Button in Chat
- **Location**: Chat input area
- **Supported Types**:
  - Photos/Images (JPEG, PNG, GIF, WebP)
  - Videos (MP4, MOV, WebM)
  - Documents (PDF, DOC, DOCX, TXT, XLS, PPT)
  - Links (any valid URL)

### 2. Automatic Media Routing
- Images → Media tab > Photos filter
- Videos → Media tab > Videos filter
- Documents → Media tab > Files filter
- Links → Media tab > Links filter

### 3. Real-time Synchronization
- Uploads appear instantly in chat for all participants
- Media tabs update automatically without refresh
- Supabase Realtime ensures consistency across devices

### 4. Inline Media Display
- Images: Thumbnail with full-size on click
- Videos: Inline player with controls
- Files: Download chip with file info
- Links: Rich preview card with OG metadata

## Technical Implementation

### Services
- `uploadService.ts`: Handles file uploads to Supabase Storage
- `linkService.ts`: Extracts URL metadata
- `chatService.ts`: Manages chat messages with attachments

### Hooks
- `useShareAsset`: Unified upload workflow
- `useMediaSync`: Real-time media synchronization

### Components
- `ChatInput`: Enhanced with share dropdown
- `MessageRenderer`: Displays inline media
- `MediaTabs`: Filtered media gallery

### Database Schema
```sql
-- Chat messages with attachment support
trip_chat_messages:
  - attachment_type: 'image' | 'video' | 'file' | 'link'
  - attachment_ref_id: UUID reference
  - attachment_url: Direct URL

-- Media index
trip_media_index:
  - media_type: 'image' | 'video'
  - media_url: Storage URL
  - metadata: JSON (dimensions, duration, etc.)

-- File storage
trip_files:
  - file_url: Storage URL
  - mime_type: File MIME type
  - size_bytes: File size

-- Link index
trip_link_index:
  - url: Original URL
  - og_title: Open Graph title
  - og_image_url: Preview image
  - og_description: Description
```

### Storage Structure
```
advertiser-assets/
  └── {trip_id}/
      ├── images/
      │   └── {uuid}.{ext}
      ├── videos/
      │   └── {uuid}.{ext}
      └── files/
          └── {uuid}.{ext}
```

## Mobile Responsiveness

### Optimizations
- Touch-friendly share menu
- Responsive media grid (2-4 columns)
- Landscape video playback
- Drag & drop on desktop
- Native file picker on mobile

### Performance
- Lazy loading for media items
- Optimistic UI updates
- Progressive image loading
- Video thumbnail generation

## Usage Examples

### Sharing an Image
1. Click Share button in chat
2. Select "Photo/Image"
3. Choose file(s)
4. Image appears in chat + Photos tab

### Sharing a Link
1. Click Share button
2. Select "Link"
3. Paste URL
4. Link preview appears in chat + Links tab

### Drag & Drop (Desktop)
1. Drag files into chat input area
2. Files auto-categorized by type
3. Upload progress shown
4. Success notification

## API Integration

### Upload Endpoint
```typescript
POST /storage/v1/object/advertiser-assets/{path}
Headers:
  - Authorization: Bearer {token}
  - Content-Type: {mime-type}
```

### Real-time Subscriptions
```typescript
// Subscribe to media updates
supabase
  .channel(`media:${tripId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'trip_media_index',
    filter: `trip_id=eq.${tripId}`
  }, handleMediaInsert)
  .subscribe();
```

## Error Handling

- File size limits (10MB default)
- Invalid file types rejected
- Network failures with retry
- Quota exceeded notifications

## Security

- Row Level Security (RLS) on all tables
- Storage bucket policies
- Authenticated uploads only
- Trip member validation

## Future Enhancements

1. **AI Features**
   - Auto-tagging images
   - Smart photo albums
   - Content moderation

2. **Advanced Media**
   - Audio messages
   - Live streaming
   - 360° photos

3. **Collaboration**
   - Collaborative albums
   - Media reactions
   - Shared playlists