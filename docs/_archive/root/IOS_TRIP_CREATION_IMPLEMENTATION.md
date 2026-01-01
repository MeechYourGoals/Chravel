# iOS Trip Creation Implementation Guide

## Overview
This document outlines the remaining iOS native implementation work for trip creation, which requires Swift/SwiftUI development that cannot be completed by Cursor AI.

## Current Status
- ✅ **Web Implementation**: 92% complete with validation
- ⚠️ **iOS Implementation**: 50% complete - requires native Swift code

---

## iOS Implementation Requirements

### 1. Native Trip Creation View (`TripCreationView.swift`)

**Location**: `ios/App/App/Views/TripCreationView.swift`

**Requirements**:
- SwiftUI Form with all trip creation fields
- Integration with existing `tripService.ts` (via Capacitor bridge)
- Real-time validation matching web implementation
- Native iOS date pickers and form controls

**Key Components Needed**:
```swift
struct TripCreationView: View {
    @State private var tripTitle: String = ""
    @State private var location: String = ""
    @State private var startDate: Date = Date()
    @State private var endDate: Date = Date()
    @State private var tripType: TripType = .consumer
    @State private var validationErrors: [String: String] = [:]
    
    // Form validation logic
    // Date range validation
    // Duplicate name detection
    // Submit handler
}
```

---

### 2. Date Range Picker Component (`DateRangePicker.swift`)

**Location**: `ios/App/App/Components/DateRangePicker.swift`

**Requirements**:
- Native iOS date picker with start/end date selection
- Visual validation feedback (red borders for invalid ranges)
- Minimum/maximum date constraints
- Matches web validation: end date must be after start date

**Implementation Notes**:
- Use `DatePicker` with `.datePickerStyle(.compact)` or `.graphical`
- Add validation state to show error messages
- Ensure accessibility labels match web implementation

---

### 3. Trip Type Selector (`TripTypeSelector.swift`)

**Location**: `ios/App/App/Components/TripTypeSelector.swift`

**Requirements**:
- Segmented control or picker for Consumer/Pro/Event selection
- Visual indicators matching web (icons: Users/Building/PartyPopper)
- Disabled state for Pro/Event if user doesn't have Pro subscription
- Privacy mode auto-update based on selection

**Trip Types**:
- `consumer`: Default, available to all users
- `pro`: Requires Pro subscription (check `user_roles` table)
- `event`: Requires Pro subscription

---

### 4. Photo Upload (`CoverPhotoPicker.swift`)

**Location**: `ios/App/App/Components/CoverPhotoPicker.swift`

**Requirements**:
- Use `PHPickerViewController` for photo selection
- Support camera capture via `UIImagePickerController`
- Image compression/optimization before upload
- Upload to Supabase Storage via Capacitor bridge
- Show preview of selected image

**Implementation Pattern**:
```swift
import PhotosUI
import SwiftUI

struct CoverPhotoPicker: View {
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    
    // PHPickerViewController integration
    // Image upload to Supabase Storage
    // Preview display
}
```

---

### 5. Location Autocomplete (`LocationAutocompleteView.swift`)

**Location**: `ios/App/App/Components/LocationAutocompleteView.swift`

**Requirements**:
- Use `MKLocalSearchCompleter` for location autocomplete
- Display search results in native list
- Integrate with Google Places API (if available) for better results
- Geocoding validation before submission

**Implementation Notes**:
- `MKLocalSearchCompleter` provides local iOS search
- For Google Places integration, use Capacitor bridge to call web API
- Show loading state during search
- Handle no results gracefully

---

### 6. Real-Time Form Validation

**Requirements**:
- **Duplicate Name Detection**: Query existing trips via Capacitor bridge to `tripService.getUserTrips()`
- **Date Range Validation**: End date must be after start date (client-side)
- **Required Field Validation**: Title, location, dates are required
- **Visual Feedback**: Red borders, error messages below fields

**Validation Rules** (matching web):
1. Trip title: Required, check for duplicates (case-insensitive, excluding archived trips)
2. Location: Required
3. Start date: Required, must be before end date
4. End date: Required, must be after start date
5. Trip type: Required, Pro/Event require subscription check

---

### 7. Testing Requirements (`XCUITest`)

**Location**: `ios/App/AppUITests/TripCreationTests.swift`

**Test Scenarios**:
1. ✅ Create consumer trip successfully
2. ✅ Validate date range (end before start shows error)
3. ✅ Validate duplicate name detection
4. ✅ Pro/Event trip creation requires subscription
5. ✅ Photo upload flow
6. ✅ Location autocomplete selection
7. ✅ Form submission with all valid data
8. ✅ Error handling for network failures

---

## Integration Points

### Capacitor Bridge
The iOS app should use the existing Capacitor bridge to call TypeScript services:

```swift
// Example: Call tripService via Capacitor
@objc func createTrip(_ call: CAPPluginCall) {
    // Bridge to tripService.createTrip()
    // Handle response/errors
}
```

**Existing Services to Bridge**:
- `tripService.createTrip()` - Create trip
- `tripService.getUserTrips()` - Get user trips for duplicate check
- `organizationService.getUserOrganizations()` - Get organizations for Pro/Event trips

### Supabase Integration
- Use existing Supabase Swift SDK or Capacitor bridge
- Authentication: Use existing auth flow
- Storage: Upload cover photos to `trip-covers` bucket

---

## Design Guidelines

### UI/UX Consistency
- Match web modal design (dark theme: slate-800 background, blue-600 accents)
- Use native iOS components but maintain visual consistency
- Error messages: Red text (`#ef4444`), small font size
- Form fields: Rounded corners (`rounded-xl` equivalent), proper spacing

### Accessibility
- VoiceOver labels for all form fields
- Dynamic Type support for text sizes
- Proper focus management
- Keyboard navigation support

### Performance
- Debounce validation checks (especially duplicate name)
- Lazy load organization list for Pro/Event trips
- Optimize image uploads (compress before upload)

---

## Backend Considerations

### Edge Function Validation
The `create-trip` edge function already handles:
- ✅ Authentication check
- ✅ Pro subscription check for Pro/Event trips
- ✅ Input sanitization

**Additional Validation Needed** (if not already present):
- ❓ Duplicate name check at database level (optional - currently handled client-side)
- ❓ Date range validation at database level (optional - currently handled client-side)

---

## Handoff Checklist

### For iOS Developer:
- [ ] Create `TripCreationView.swift` with full form
- [ ] Implement `DateRangePicker.swift` component
- [ ] Implement `TripTypeSelector.swift` component
- [ ] Implement `CoverPhotoPicker.swift` with PHPickerViewController
- [ ] Implement `LocationAutocompleteView.swift` with MKLocalSearchCompleter
- [ ] Add real-time validation matching web implementation
- [ ] Write XCUITest test suite
- [ ] Test on iOS 15+ devices (iPhone and iPad)
- [ ] Verify accessibility (VoiceOver, Dynamic Type)
- [ ] Test error handling and edge cases

### Estimated Development Time:
- **TripCreationView**: 4-6 hours
- **DateRangePicker**: 2-3 hours
- **TripTypeSelector**: 1-2 hours
- **CoverPhotoPicker**: 3-4 hours
- **LocationAutocompleteView**: 4-5 hours
- **Validation Logic**: 2-3 hours
- **Testing**: 3-4 hours
- **Total**: ~20-27 hours

---

## Web Implementation Reference

For consistency, refer to:
- `src/components/CreateTripModal.tsx` - Full validation logic
- `src/hooks/useTrips.ts` - Trip creation hook
- `src/services/tripService.ts` - Service layer

**Key Validation Functions** (to replicate in Swift):
- `validateDateRange()` - End date after start date
- `validateDuplicateName()` - Check existing trips
- `validateForm()` - Overall form validation

---

## Questions for iOS Developer

1. **Capacitor Bridge**: Does the existing Capacitor setup support calling TypeScript services from Swift? If not, what's the preferred pattern?

2. **Google Places**: Should location autocomplete use native `MKLocalSearchCompleter` or bridge to web Google Places API? (Native is faster, but Google Places has better international coverage)

3. **Image Upload**: Is there an existing pattern for uploading images to Supabase Storage from iOS? Should we use Capacitor bridge or direct Supabase Swift SDK?

4. **State Management**: Should form state be managed locally in SwiftUI or shared with a state management solution?

---

**Last Updated**: 2025-01-31
**Status**: Ready for iOS developer handoff
