# Chravel Advertiser System Documentation

## Overview

The Chravel Advertiser System allows businesses to create and manage advertising campaigns that appear as "Travel Recs" within the Chravel platform. This system is designed to seamlessly integrate promotional content with organic trip recommendations while maintaining a premium user experience.

## Architecture

### Database Schema

The advertiser system uses the following tables:

1. **advertisers** - Stores advertiser profile information
   - Links to auth.users for authentication
   - Tracks company details and status

2. **campaigns** - Main campaign information
   - Includes name, description, images, and discount details
   - Tracks performance metrics (impressions, clicks, conversions)
   - Supports draft/active/paused/ended status states

3. **campaign_targeting** - Targeting parameters for campaigns
   - Age ranges, gender preferences
   - Interest categories (nightlife, adventure, luxury, etc.)
   - Location and trip type targeting

4. **campaign_analytics** - Event tracking for campaign performance
   - Tracks impressions, clicks, and conversions
   - Stores user interactions for analysis

### Key Features

#### 1. Advertiser Authentication
- Uses existing Chravel auth system
- Advertisers must create a profile before creating campaigns
- Row-level security ensures advertisers can only manage their own content

#### 2. Campaign Management
- **Creation Wizard**: 5-step process for creating campaigns
  - Campaign details (name, description, discount)
  - Image upload (carousel support, 2-10 images)
  - Audience targeting
  - Scheduling and budget
  - Review and launch
  
- **Live Preview**: Shows how campaigns will appear as trip cards
- **Status Management**: Draft, active, paused, ended states
- **Real-time Analytics**: Track impressions, clicks, CTR, conversions

#### 3. Image Management
- Secure upload through Supabase Storage
- Automatic optimization and CDN delivery
- Support for multiple images per campaign (carousel)

#### 4. Targeting System
- **Demographics**: Age range, gender
- **Interests**: Nightlife, food & dining, adventure, luxury, etc.
- **Trip Types**: Leisure, business, group, family, romantic
- **Locations**: City/region targeting

## User Flow

### For Advertisers

1. **Access**: Navigate to Settings → Advertiser Hub
2. **Onboarding**: Create advertiser profile with company details
3. **Campaign Creation**:
   - Fill out campaign details
   - Upload images
   - Set targeting parameters
   - Review and launch
4. **Management**: 
   - View campaign performance
   - Pause/resume campaigns
   - Access analytics dashboard

### For End Users

1. Campaigns appear as "Promoted" cards in Travel Recs section
2. Cards match the visual style of organic trip recommendations
3. Discount badges highlight special offers
4. Clicking tracks engagement for analytics

## API Integration

### Key Services

```typescript
// Get advertiser profile
AdvertiserService.getAdvertiserProfile()

// Create new campaign
AdvertiserService.createCampaign(formData)

// Track user interaction
AdvertiserService.trackEvent(campaignId, 'click')

// Get active campaigns for display
AdvertiserService.getActiveCampaigns(filters)
```

### Security

- All API calls require authentication
- Row-level security policies enforce data isolation
- Image uploads validated for type and size
- CORS configured for secure cross-origin requests

## Display Integration

Campaigns are displayed using the `CampaignPreview` component, which renders campaigns to look like trip cards with:
- Promoted badge
- Discount badge (if applicable)
- Image carousel
- Destination information
- Action buttons (View Details, Book Now)

## Analytics & Reporting

The system tracks:
- **Impressions**: How many times a campaign was viewed
- **Clicks**: User interactions with campaigns
- **CTR (Click-through Rate)**: Clicks / Impressions
- **Conversions**: Completed bookings or actions
- **Conversion Rate**: Conversions / Clicks

Analytics are available in real-time through the advertiser dashboard.

## Future Enhancements

1. **Budget Management**: Daily/total budget limits with automatic pausing
2. **A/B Testing**: Multiple creative variants per campaign
3. **API Access**: Programmatic campaign management
4. **Advanced Analytics**: Cohort analysis, attribution modeling
5. **Automated Bidding**: Dynamic pricing based on competition

## Technical Implementation

### Frontend Components
- `/src/pages/AdvertiserDashboard.tsx` - Main dashboard
- `/src/components/advertiser/*` - Advertiser-specific components
- `/src/services/advertiserService.ts` - API service layer
- `/src/types/advertiser.ts` - TypeScript types

### Backend
- `/supabase/migrations/20251220_add_advertiser_system.sql` - Database schema
- `/supabase/functions/upload-campaign-image` - Secure image upload
- Storage bucket: `advertiser-assets` for campaign images

### Security Considerations
- Authentication required for all advertiser operations
- RLS policies enforce data isolation
- File upload validation (type, size)
- Public read access for campaign display
- Secure analytics tracking without PII exposure