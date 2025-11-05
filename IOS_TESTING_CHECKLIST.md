# 📱 iOS Testing Checklist for Physical Device
**Complete testing guide for human developer**

---

## 🎯 **Pre-Testing Setup**

### Requirements:
- [ ] Physical iPhone (iOS 15+ recommended)
- [ ] Xcode installed on Mac
- [ ] Apple Developer Account (for push notifications)
- [ ] iPhone connected via USB or same WiFi
- [ ] Test user account in Chravel

### Build & Deploy to iPhone:
```bash
# 1. Build web assets
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode:
#    - Select your iPhone as target
#    - Click "Run" (▶️ button)
#    - App will install on your iPhone
```

---

## 1️⃣ **Messaging/Chat Testing** (Current: 90% → Target: 95%)

### Keyboard Behavior:
- [ ] **Open chat, tap input field**
  - ✅ Keyboard appears smoothly
  - ✅ Input field scrolls up, not covered by keyboard
  - ✅ Can see last few messages while typing
  - ✅ SafeArea insets respected (no notch overlap)

- [ ] **Type a long message**
  - ✅ Input field expands vertically
  - ✅ Can still see send button
  - ✅ Keyboard doesn't flicker/jump

- [ ] **Tap outside input / swipe down**
  - ✅ Keyboard dismisses smoothly
  - ✅ Chat scrolls back to normal position

### Attachment Uploads:
- [ ] **Tap attachment button → Camera**
  - ✅ iOS camera permission requested (first time)
  - ✅ Camera opens
  - ✅ Take photo → appears in chat
  - ✅ Photo uploads successfully

- [ ] **Tap attachment button → Photo Library**
  - ✅ iOS Photos permission requested (first time)
  - ✅ Photo picker opens
  - ✅ Select photo → appears in chat
  - ✅ Photo uploads successfully

- [ ] **Video upload**
  - ✅ Select video from library
  - ✅ Video uploads (check size limits)
  - ✅ Video plays in chat

### Edge Cases:
- [ ] Rotate device → keyboard still works
- [ ] Background app → return → keyboard works
- [ ] Low memory warning → keyboard works
- [ ] Airplane mode → graceful error message

**Issues Found:**
```
(Record any issues here)
- Example: Keyboard covers input on iPhone SE
- Example: Photos permission crashes app
```

---

## 2️⃣ **Calendar/Itinerary Testing** (Current: 85% → Target: 95%)

### Date/Time Pickers:
- [ ] **Create new calendar event**
  - ✅ Tap "Add Event"
  - ✅ Date picker appears (iOS native style)
  - ✅ Select date → displays correctly
  - ✅ Time picker appears (12/24hr based on device settings)
  - ✅ Select time → displays correctly

- [ ] **Edit existing event**
  - ✅ Tap event → edit
  - ✅ Date picker shows current date
  - ✅ Time picker shows current time
  - ✅ Change date/time → saves correctly

### Timezone Handling:
- [ ] **Create event with specific timezone**
  - ✅ Timezone selector works
  - ✅ Event displays in correct timezone
  - ✅ Event displays correctly after changing device timezone

### Drag-and-Drop:
- [ ] **Drag event on calendar**
  - ✅ Touch and hold event
  - ✅ Drag to new date/time
  - ✅ Drop → event moves
  - ✅ Saves successfully

### PDF Export:
- [ ] **Export itinerary to PDF**
  - ✅ Tap "Export" button
  - ✅ PDF generates
  - ✅ Share sheet appears (iOS native)
  - ✅ Share → Save to Files
  - ✅ PDF appears in Files app
  - ✅ PDF opens correctly in Files app

- [ ] **Share PDF**
  - ✅ Share → AirDrop works
  - ✅ Share → Messages works
  - ✅ Share → Email works

**Issues Found:**
```
(Record any issues here)
```

---

## 3️⃣ **Media Tab Testing** (Current: 80% → Target: 90%)

### Camera Capture:
- [ ] **Take photo via camera**
  - ✅ Tap camera icon
  - ✅ Camera permission requested
  - ✅ Camera opens (back camera)
  - ✅ Take photo
  - ✅ Review screen appears
  - ✅ Use Photo → uploads successfully
  - ✅ Photo appears in media tab

- [ ] **Front camera (selfie)**
  - ✅ Switch to front camera
  - ✅ Take selfie
  - ✅ Uploads successfully

### Photo Library Access:
- [ ] **Select existing photo**
  - ✅ Photos permission requested
  - ✅ Photo picker opens
  - ✅ Browse albums
  - ✅ Select photo → uploads
  - ✅ Appears in media tab

- [ ] **Select multiple photos**
  - ✅ Multi-select works
  - ✅ All photos upload
  - ✅ Progress indicator shows

### Video Handling:
- [ ] **Record video**
  - ✅ Camera → video mode
  - ✅ Record video (try 30 seconds)
  - ✅ Stop recording
  - ✅ Video uploads (check file size)
  - ✅ Video plays in media tab

- [ ] **Large video**
  - ✅ Try video > 50MB
  - ✅ Error message appears if too large
  - ✅ Suggests compression

### File Uploads:
- [ ] **Upload document from Files app**
  - ✅ Tap "Upload File"
  - ✅ Files app opens
  - ✅ Select PDF → uploads
  - ✅ Appears in Files sub-tab

### Media Parsing from Chat:
- [ ] **Send image URL in chat**
  - ✅ Paste image URL in chat
  - ✅ Send message
  - ✅ Image appears in Photos tab (auto-parsed) ✨

- [ ] **Send regular URL in chat**
  - ✅ Paste URL (e.g., booking.com link)
  - ✅ Send message
  - ✅ Link appears in URLs tab (auto-parsed) ✨

**Issues Found:**
```
(Record any issues here)
```

---

## 4️⃣ **Payments/Budget Testing** (Current: 90% → Target: 95%)

### Payment Tracking:
- [ ] **Create payment**
  - ✅ Tap "Add Expense"
  - ✅ Enter amount, description
  - ✅ Split detection auto-populates trip members ✨
  - ✅ Select payment method (Venmo, PayPal, Zelle)
  - ✅ Save → appears in payments list

- [ ] **Payment method validation**
  - ✅ Add Venmo handle → validates @username format
  - ✅ Add PayPal email → validates email format
  - ✅ Add Zelle (phone/email) → validates format
  - ✅ Invalid format → error message

- [ ] **Mark as paid**
  - ✅ Tap payment → "Mark as Paid"
  - ✅ Confirmation dialog
  - ✅ Confirm → payment marked paid ✅
  - ✅ Visual indicator changes

### Budget Tracking:
- [ ] **View budget categories**
  - ✅ Budget breakdown displays
  - ✅ Category totals correct
  - ✅ Progress bars render

- [ ] **Export payment history**
  - ✅ Tap "Export"
  - ✅ Share sheet appears
  - ✅ Export to Files as CSV
  - ✅ CSV opens in Numbers/Excel

**Issues Found:**
```
(Record any issues here)
```

---

## 5️⃣ **Places/Maps Testing** (Current: 90% → Target: 95%)

### Map Rendering:
- [ ] **Open Places tab**
  - ✅ Map loads
  - ✅ Renders correctly on iPhone screen
  - ✅ No distortion on different iPhone models

### Geolocation:
- [ ] **Get current location**
  - ✅ Location permission requested
  - ✅ "Use Current Location" button
  - ✅ Map centers on current location
  - ✅ Accuracy is reasonable (<50m)

- [ ] **Search for place**
  - ✅ Tap search
  - ✅ Autocomplete suggestions appear
  - ✅ Select place → map shows marker
  - ✅ Place details display

### Base Camp:
- [ ] **Set Trip Base Camp**
  - ✅ Search for address
  - ✅ Confirm → saves successfully
  - ✅ Displays on map with special icon

- [ ] **Set Personal Base Camp**
  - ✅ Same process as Trip Base Camp
  - ✅ Saves to user preferences
  - ✅ Persists across trips

**Issues Found:**
```
(Record any issues here)
```

---

## 6️⃣ **AI Concierge Testing** (Current: 85% → Target: 92%)

### Basic Functionality:
- [ ] **Ask AI question**
  - ✅ Type question
  - ✅ Send → AI responds
  - ✅ Response is relevant
  - ✅ Loading indicator shows while thinking

### Context Awareness:
- [ ] **Ask about trip details**
  - ✅ "What's on the schedule today?"
  - ✅ AI uses trip calendar data ✨
  - ✅ "Who's in the trip?"
  - ✅ AI lists trip members ✨

- [ ] **Ask about payments**
  - ✅ "Who owes money?"
  - ✅ AI calculates from payments data ✨

### Offline Mode:
- [ ] **Enable airplane mode**
  - ✅ Ask AI question
  - ✅ Graceful error message
  - ✅ "You're offline" notification ✨

### Rate Limiting:
- [ ] **Free user: test 5 query limit**
  - ✅ Send 5 queries
  - ✅ 6th query shows limit message
  - ✅ Upgrade prompt appears

### Image Analysis:
- [ ] **Ask about image**
  - ✅ Upload image
  - ✅ Ask "What's in this image?"
  - ✅ AI analyzes correctly

**Issues Found:**
```
(Record any issues here)
```

---

## 7️⃣ **Travel Wallet/Export Testing** (Current: 85% → Target: 92%)

### PDF Export:
- [ ] **Export trip PDF**
  - ✅ Tap "Export to PDF"
  - ✅ PDF generates
  - ✅ iOS share sheet appears
  - ✅ Save to Files → PDF in Files app ✨
  - ✅ PDF opens in Files app (no corruption)

- [ ] **Share PDF**
  - ✅ AirDrop works
  - ✅ Email works
  - ✅ Messages works

### Budget Export:
- [ ] **Export budget to Excel**
  - ✅ Tap "Export Budget"
  - ✅ Excel file generates
  - ✅ Share sheet appears
  - ✅ Save to Files → .xlsx file ✨
  - ✅ Opens in Numbers/Excel

**Issues Found:**
```
(Record any issues here)
```

---

## 8️⃣ **Notifications Testing** (Current: 85% → Target: 92%)

### ⚠️ **Prerequisites** (Human MUST do first):
1. **APNs Certificate Setup:**
   - [ ] Log into Apple Developer Portal
   - [ ] Create APNs Authentication Key (.p8 file)
   - [ ] Download .p8 key
   - [ ] Add to Supabase secrets:
     - `APNS_KEY_ID`
     - `APNS_TEAM_ID`
     - `APNS_KEY_CONTENT` (base64 encoded .p8)

2. **Firebase Setup:**
   - [ ] Create Firebase project
   - [ ] Add iOS app to Firebase
   - [ ] Upload APNs certificate to Firebase
   - [ ] Get FCM Server Key
   - [ ] Add `FIREBASE_SERVER_KEY` to Supabase secrets

### Push Notification Permissions:
- [ ] **First app launch**
  - ✅ Permission dialog appears
  - ✅ Tap "Allow"
  - ✅ Token registered successfully

### Receiving Notifications:
- [ ] **Broadcast notification**
  - ✅ Another user sends broadcast
  - ✅ Push notification received ✨
  - ✅ Notification shows title and body
  - ✅ Tap notification → opens trip

- [ ] **@Mention notification**
  - ✅ Another user @mentions you in chat
  - ✅ Push notification received ✨
  - ✅ Tap → opens to chat message

- [ ] **Task assignment**
  - ✅ Another user assigns task to you
  - ✅ Push notification received ✨
  - ✅ Tap → opens to tasks

- [ ] **Payment request**
  - ✅ Payment split includes you
  - ✅ Push notification received ✨
  - ✅ Tap → opens to payments

- [ ] **Calendar reminder**
  - ✅ Event in 15 minutes
  - ✅ Push notification received ✨
  - ✅ Tap → opens to calendar

### Notification States:
- [ ] **App in foreground**
  - ✅ Notification appears as banner
  - ✅ Can be dismissed

- [ ] **App in background**
  - ✅ Notification appears in lock screen
  - ✅ Tap → opens app to correct screen

- [ ] **App closed completely**
  - ✅ Notification received
  - ✅ Tap → launches app to correct screen

### Notification Preferences:
- [ ] **Disable a notification type**
  - ✅ Go to Settings → Notifications
  - ✅ Disable "Broadcasts"
  - ✅ Send broadcast → NO notification received ✅
  - ✅ Other types still work

- [ ] **Quiet hours**
  - ✅ Enable quiet hours (10pm-8am)
  - ✅ Send broadcast at 11pm
  - ✅ NO notification received ✅
  - ✅ Send at 9am → notification received

### In-App Notifications:
- [ ] **Notification bell icon**
  - ✅ Badge shows unread count
  - ✅ Tap → opens notification list
  - ✅ Tap notification → opens relevant screen
  - ✅ Mark as read → badge decreases

**Issues Found:**
```
(Record any issues here)
```

---

## 9️⃣ **General iOS UX Testing**

### Device Compatibility:
- [ ] **iPhone SE (small screen)**
  - ✅ All UI elements visible
  - ✅ Touch targets large enough (44px+)
  - ✅ Text readable
  - ✅ No horizontal scrolling

- [ ] **iPhone Pro Max (large screen)**
  - ✅ UI scales appropriately
  - ✅ No weird stretching
  - ✅ SafeArea respected

### Orientation:
- [ ] **Portrait mode**
  - ✅ All features work
  - ✅ Layout looks good

- [ ] **Landscape mode**
  - ✅ App handles rotation
  - ✅ Layout adjusts appropriately
  - ✅ Keyboard still works

### Performance:
- [ ] **App launch time**
  - ✅ Cold start < 3 seconds
  - ✅ Warm start < 1 second

- [ ] **Scrolling performance**
  - ✅ Chat scrolls smoothly (60fps)
  - ✅ Calendar scrolls smoothly
  - ✅ Media grid scrolls smoothly

- [ ] **Memory usage**
  - ✅ No crashes after 30 minutes
  - ✅ No memory warnings

### Network Conditions:
- [ ] **Slow network (3G)**
  - ✅ Loading indicators show
  - ✅ No app freezes
  - ✅ Graceful error messages

- [ ] **Offline mode**
  - ✅ App doesn't crash
  - ✅ "Offline" message shows
  - ✅ Cached data still accessible

- [ ] **Network switch (WiFi → Cellular)**
  - ✅ Seamless transition
  - ✅ No connection errors

### Edge Cases:
- [ ] **Low battery**
  - ✅ App still functions
  - ✅ Low Power Mode doesn't break features

- [ ] **Incoming call**
  - ✅ App goes to background
  - ✅ Resume after call → works normally

- [ ] **Background app refresh**
  - ✅ New messages sync in background
  - ✅ Notifications still arrive

**Issues Found:**
```
(Record any issues here)
```

---

## 📊 **Testing Summary**

### Feature Readiness:
```
Messaging/Chat:        [  ] 95% (Target)
Calendar/Itinerary:    [  ] 95% (Target)
Media Tab:             [  ] 90% (Target)
Payments/Budget:       [  ] 95% (Target)
Places/Maps:           [  ] 95% (Target)
AI Concierge:          [  ] 92% (Target)
Travel Wallet/Export:  [  ] 92% (Target)
Notifications:         [  ] 92% (Target)
```

### Critical Issues Found:
```
(List any blocking issues that prevent iOS launch)
1. 
2.
3.
```

### Non-Critical Issues:
```
(List minor issues that can be fixed post-launch)
1.
2.
3.
```

### Estimated Fix Time:
```
Critical issues: ___ hours
Non-critical issues: ___ hours
Total: ___ hours
```

---

## ✅ **Sign-Off**

- [ ] All critical features tested
- [ ] All critical issues fixed
- [ ] Non-critical issues documented
- [ ] App ready for TestFlight submission

**Tester Name:** ___________________
**Date:** ___________________
**iPhone Model:** ___________________
**iOS Version:** ___________________

---

## 📝 **Next Steps**

After passing all tests:
1. ✅ Create App Store Connect listing
2. ✅ Prepare screenshots (see APP_STORE_SCREENSHOTS.md)
3. ✅ Submit to TestFlight for beta testing
4. ✅ Gather beta feedback
5. ✅ Fix any beta issues
6. ✅ Submit to App Store for review

**Good luck! 🚀**
