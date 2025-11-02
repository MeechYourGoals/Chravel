# Pro: Team, Tags, Broadcasts, Schedules

**Feature Owner**: Pro/Enterprise Module  
**Dependencies**: `trips`, `trip_members`, `broadcasts`, `broadcast_reactions`, `game_schedules`, `show_schedules`, `organizations`

---

## ⚡ IMPORTANT: Team Tab Structure Update (2025-10-27)

**Breaking Change**: The Team tab now uses a sub-tab navigation pattern.

### New Structure:
```
TeamView (SwiftUI)
├─ TabView or SegmentedControl
│   ├─ ChannelsView (default) - Shows role-based channels
│   └─ RolesView - Shows team roster with role management
```

### Implementation Notes for iOS:

1. **Default View**: ChannelsView should be the initially selected tab
2. **Navigation**: Use SwiftUI `Picker` with `.segmentedPickerStyle()` or custom tabs
3. **State Management**: Track `selectedTeamSubTab` in `@State` variable
4. **Data Fetching**: 
   - ChannelsView fetches accessible channels via `/role-channels/:tripId`
   - RolesView fetches roster via `/trips/:tripId/roster`

### Example SwiftUI Structure:

```swift
struct TeamTabView: View {
    @State private var selectedSubTab: TeamSubTab = .channels
    
    enum TeamSubTab: String, CaseIterable {
        case channels = "Channels"
        case roles = "Roles"
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Sub-tab Picker
            Picker("Team Section", selection: $selectedSubTab) {
                ForEach(TeamSubTab.allCases, id: \.self) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Content
            TabView(selection: $selectedSubTab) {
                ChannelsView(tripId: tripId)
                    .tag(TeamSubTab.channels)
                
                RolesView(roster: roster, category: category)
                    .tag(TeamSubTab.roles)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
    }
}
```

### Consistency Requirements:
- ✅ Channels tab must be default across all Pro trip types
- ✅ Scrolling must work properly (no cut-off content)
- ✅ Admin controls (Create Role button) only visible in Roles tab
- ✅ Channel grid layout should be used for ChannelsView

---

## Overview

Pro trips unlock advanced team management, broadcast messaging, scheduling, and organizational features for sports teams, entertainment tours, and corporate travel.

---

## 1. Team Roster Management

### Data Model (Swift)

```swift
struct ProParticipant: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    var avatar: String?
    var role: String // Dynamic role based on category
    var credentialLevel: CredentialLevel
    var permissions: [String]
    var roomPreferences: [String]?
    var dietaryRestrictions: [String]?
    var medicalNotes: String?
}

enum CredentialLevel: String, Codable {
    case allAccess = "AllAccess"
    case backstage = "Backstage"
    case guest = "Guest"
    case restricted = "Restricted"
}
```

### Category-Specific Roles

Roles are defined per category in `src/types/proCategories.ts`:

```swift
struct ProCategoryConfig {
    let id: String
    let name: String
    let description: String
    let roles: [String]
    let availableTabs: [String]
    let requiredTabs: [String]
    let terminology: CategoryTerminology
}

struct CategoryTerminology {
    let teamLabel: String
    let memberLabel: String
    let leaderLabel: String
}

// Example configs
let categoryConfigs: [String: ProCategoryConfig] = [
    "Sports – Pro, Collegiate, Youth": ProCategoryConfig(
        id: "Sports – Pro, Collegiate, Youth",
        name: "Sports – Pro, Collegiate, Youth",
        description: "Professional, collegiate, and youth sports teams",
        roles: ["Player", "Coach", "Crew", "VIP", "Security", "Medical", "Tech"],
        availableTabs: ["chat", "calendar", "tasks", "polls", "places", "team", "finance", "medical", "compliance", "ai-chat"],
        requiredTabs: ["team", "medical"],
        terminology: CategoryTerminology(
            teamLabel: "Team Roster",
            memberLabel: "Team Member",
            leaderLabel: "Team Captain"
        )
    ),
    "Tour – Music, Comedy, etc.": ProCategoryConfig(
        id: "Tour – Music, Comedy, etc.",
        name: "Tour – Music, Comedy, etc.",
        description: "Music tours, comedy shows, podcast tours",
        roles: ["Artist Team", "Tour Manager", "Crew", "VIP", "Security"],
        availableTabs: ["chat", "calendar", "tasks", "polls", "places", "team", "finance", "sponsors", "ai-chat"],
        requiredTabs: ["team"],
        terminology: CategoryTerminology(
            teamLabel: "Tour Crew",
            memberLabel: "Crew Member",
            leaderLabel: "Tour Manager"
        )
    ),
    "Business Travel": ProCategoryConfig(
        id: "Business Travel",
        name: "Business Travel",
        description: "Corporate retreats, executive meetings",
        roles: [], // Manually defined roles
        availableTabs: ["chat", "calendar", "tasks", "polls", "places", "team", "finance", "compliance", "ai-chat"],
        requiredTabs: ["team"],
        terminology: CategoryTerminology(
            teamLabel: "Attendees",
            memberLabel: "Participant",
            leaderLabel: "Event Lead"
        )
    )
    // ... other categories
]
```

### API: Fetch Team Roster

```swift
func fetchTeamRoster(tripId: String) async throws -> [ProParticipant] {
    let response = try await supabase
        .from("trip_members")
        .select("""
            id,
            user_id,
            role,
            profiles!inner(
                user_id,
                display_name,
                email,
                avatar_url
            )
        """)
        .eq("trip_id", value: tripId)
        .execute()
    
    let data = try JSONDecoder().decode([TripMemberWithProfile].self, from: response.data)
    return data.map { member in
        ProParticipant(
            id: member.id,
            name: member.profiles.displayName,
            email: member.profiles.email,
            avatar: member.profiles.avatarUrl,
            role: member.role,
            credentialLevel: .guest,
            permissions: []
        )
    }
}
```

### API: Add Team Member

```swift
func addTeamMember(tripId: String, userId: UUID, role: String) async throws {
    try await supabase
        .from("trip_members")
        .insert([
            "trip_id": tripId,
            "user_id": userId.uuidString,
            "role": role
        ])
        .execute()
}
```

### UI: Team Tab

```swift
struct TeamTabView: View {
    let tripId: String
    let category: String
    @State private var members: [ProParticipant] = []
    @State private var showAddMember = false
    
    var categoryConfig: ProCategoryConfig {
        categoryConfigs[category] ?? categoryConfigs["Other"]!
    }
    
    var body: some View {
        List {
            Section(header: Text(categoryConfig.terminology.teamLabel)) {
                ForEach(members) { member in
                    HStack {
                        AsyncImage(url: URL(string: member.avatar ?? "")) { image in
                            image.resizable()
                        } placeholder: {
                            Circle().fill(Color.gray)
                        }
                        .frame(width: 40, height: 40)
                        .clipShape(Circle())
                        
                        VStack(alignment: .leading) {
                            Text(member.name).font(.headline)
                            Text(member.role).font(.caption).foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Text(member.credentialLevel.rawValue)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.2))
                            .cornerRadius(8)
                    }
                }
            }
        }
        .navigationTitle(categoryConfig.terminology.teamLabel)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showAddMember = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddMember) {
            AddTeamMemberView(tripId: tripId, category: category)
        }
        .task {
            members = try? await fetchTeamRoster(tripId: tripId)
        }
    }
}
```

---

## 2. Tags (User-Provided)

### Data Model

Tags are stored as a JSON array in `trips.tags` (inferred from `src/data/pro-trips/lakersRoadTrip.ts`):

```swift
// In ProTripData
struct ProTripData: Codable {
    let id: String
    let title: String
    var tags: [String] // e.g., ["Sports", "Basketball", "Road Trip"]
    // ... other fields
}
```

### Example: Lakers Road Trip

From `src/data/pro-trips/lakersRoadTrip.ts`:

```typescript
tags: ["Sports", "Basketball", "Road Trip"]
```

**MVP Approach**: Tags are manually entered by users. No auto-generation. Leave a hook for future AI-based tag suggestions.

### API: Update Tags

```swift
func updateTags(tripId: String, tags: [String]) async throws {
    try await supabase
        .from("trips")
        .update(["tags": tags])
        .eq("id", value: tripId)
        .execute()
}
```

### UI: Tag Editor

```swift
struct TagEditorView: View {
    @Binding var tags: [String]
    @State private var newTag = ""
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Tags").font(.headline)
            
            FlowLayout(spacing: 8) {
                ForEach(tags, id: \.self) { tag in
                    HStack {
                        Text(tag)
                        Button(action: { tags.removeAll { $0 == tag } }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(16)
                }
            }
            
            HStack {
                TextField("Add tag", text: $newTag)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                Button("Add") {
                    if !newTag.isEmpty {
                        tags.append(newTag)
                        newTag = ""
                    }
                }
            }
        }
        .padding()
    }
}
```

---

## 3. Broadcasts

### Data Model

From Supabase schema:

```swift
struct Broadcast: Codable, Identifiable {
    let id: UUID
    let tripId: String
    let senderId: UUID
    let message: String
    let priority: BroadcastPriority
    let timestamp: Date
    var readBy: [UUID]
    
    // For filtering
    var targetDepartments: [String]?
    var targetRoles: [String]?
}

enum BroadcastPriority: String, Codable {
    case normal
    case urgent
}

struct BroadcastReaction: Codable {
    let id: UUID
    let broadcastId: UUID
    let userId: UUID
    let reactionType: String // "👍", "❤️", etc.
    let createdAt: Date
}
```

### API: Create Broadcast

From `src/services/broadcastService.ts`:

```swift
func createBroadcast(
    tripId: String,
    message: String,
    priority: BroadcastPriority
) async throws -> Broadcast {
    let broadcast: [String: Any] = [
        "trip_id": tripId,
        "sender_id": currentUserId.uuidString,
        "message": message,
        "priority": priority.rawValue,
        "timestamp": ISO8601DateFormatter().string(from: Date()),
        "read_by": []
    ]
    
    let response = try await supabase
        .from("broadcasts")
        .insert(broadcast)
        .select()
        .single()
        .execute()
    
    return try JSONDecoder().decode(Broadcast.self, from: response.data)
}
```

### API: Mark as Read

```swift
func markBroadcastAsRead(broadcastId: UUID) async throws {
    // Fetch current broadcast
    let response = try await supabase
        .from("broadcasts")
        .select()
        .eq("id", value: broadcastId.uuidString)
        .single()
        .execute()
    
    var broadcast = try JSONDecoder().decode(Broadcast.self, from: response.data)
    
    if !broadcast.readBy.contains(currentUserId) {
        broadcast.readBy.append(currentUserId)
        
        try await supabase
            .from("broadcasts")
            .update(["read_by": broadcast.readBy.map { $0.uuidString }])
            .eq("id", value: broadcastId.uuidString)
            .execute()
    }
}
```

### Real-Time: Listen to Broadcasts

```swift
func subscribeToBroadcasts(tripId: String, onBroadcast: @escaping (Broadcast) -> Void) {
    let channel = supabase.channel("broadcasts:\(tripId)")
    
    channel.on(.postgresChanges(
        event: .insert,
        schema: "public",
        table: "broadcasts",
        filter: "trip_id=eq.\(tripId)"
    )) { payload in
        if let broadcast = try? JSONDecoder().decode(Broadcast.self, from: payload.new) {
            onBroadcast(broadcast)
        }
    }
    
    channel.subscribe()
}
```

### UI: Broadcast List

```swift
struct BroadcastListView: View {
    let tripId: String
    @State private var broadcasts: [Broadcast] = []
    
    var body: some View {
        List(broadcasts) { broadcast in
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    if broadcast.priority == .urgent {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                    }
                    Text(broadcast.message)
                        .font(.body)
                    Spacer()
                }
                
                HStack {
                    Text(broadcast.timestamp, style: .relative)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text("\(broadcast.readBy.count) read")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
        .navigationTitle("Broadcasts")
        .task {
            broadcasts = try? await fetchBroadcasts(tripId: tripId)
            subscribeToBroadcasts(tripId: tripId) { newBroadcast in
                broadcasts.insert(newBroadcast, at: 0)
            }
        }
    }
}
```

---

## 4. Game & Show Schedules (Enterprise)

### Data Model

From Supabase schema:

```swift
struct GameSchedule: Codable, Identifiable {
    let id: UUID
    let organizationId: UUID
    let tripId: String?
    let opponent: String
    let venue: String
    let venueAddress: String?
    let gameDate: Date
    let gameTime: String
    let loadInTime: String?
    let status: ScheduleStatus
    let isHome: Bool
    let createdBy: UUID
}

struct ShowSchedule: Codable, Identifiable {
    let id: UUID
    let organizationId: UUID
    let tripId: String?
    let title: String
    let venue: String
    let venueAddress: String?
    let showDate: Date
    let showTime: String
    let soundcheckTime: String?
    let loadInTime: String?
    let status: ScheduleStatus
    let createdBy: UUID
}

enum ScheduleStatus: String, Codable {
    case scheduled
    case confirmed
    case completed
    case cancelled
}
```

### API: Fetch Game Schedule

```swift
func fetchGameSchedule(organizationId: UUID) async throws -> [GameSchedule] {
    let response = try await supabase
        .from("game_schedules")
        .select()
        .eq("organization_id", value: organizationId.uuidString)
        .order("game_date", ascending: true)
        .execute()
    
    return try JSONDecoder().decode([GameSchedule].self, from: response.data)
}
```

### API: Bulk Import Games

```swift
func bulkImportGames(organizationId: UUID, games: [GameSchedule]) async throws {
    let rows = games.map { game in
        [
            "organization_id": organizationId.uuidString,
            "trip_id": game.tripId,
            "opponent": game.opponent,
            "venue": game.venue,
            "venue_address": game.venueAddress,
            "game_date": ISO8601DateFormatter().string(from: game.gameDate),
            "game_time": game.gameTime,
            "load_in_time": game.loadInTime,
            "is_home": game.isHome,
            "status": game.status.rawValue,
            "created_by": currentUserId.uuidString
        ] as [String: Any]
    }
    
    try await supabase
        .from("game_schedules")
        .insert(rows)
        .execute()
}
```

### UI: Game Schedule View

```swift
struct GameScheduleView: View {
    let organizationId: UUID
    @State private var games: [GameSchedule] = []
    @State private var showImport = false
    
    var body: some View {
        List(games) { game in
            VStack(alignment: .leading) {
                HStack {
                    Text(game.opponent).font(.headline)
                    Spacer()
                    StatusChip(status: game.status)
                }
                
                HStack {
                    Image(systemName: game.isHome ? "house.fill" : "airplane")
                    Text(game.venue).font(.caption)
                }
                
                Text(game.gameDate, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 4)
        }
        .navigationTitle("Game Schedule")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Import") { showImport = true }
            }
        }
        .sheet(isPresented: $showImport) {
            CSVImportView(organizationId: organizationId)
        }
        .task {
            games = try? await fetchGameSchedule(organizationId: organizationId)
        }
    }
}

struct StatusChip: View {
    let status: ScheduleStatus
    
    var color: Color {
        switch status {
        case .scheduled: return .blue
        case .confirmed: return .green
        case .completed: return .gray
        case .cancelled: return .red
        }
    }
    
    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.2))
            .cornerRadius(8)
    }
}
```

---

## Testing Checklist

- [ ] Team roster loads with correct category roles
- [ ] Add/remove team members updates database
- [ ] Tags are editable and persist
- [ ] Broadcasts send in real-time to all trip members
- [ ] Urgent broadcasts show priority indicator
- [ ] Mark broadcast as read updates read count
- [ ] Reactions on broadcasts work (👍❤️)
- [ ] Game schedule imports from CSV
- [ ] Show schedule displays with correct status chips
- [ ] Schedule links to trip when trip_id is set
- [ ] RLS policies prevent unauthorized access

---

## Next Steps

- Add department/role targeting for broadcasts (filter by metadata)
- AI-based tag suggestions (future enhancement)
- Calendar sync for game/show schedules
- Broadcast scheduling (send at specific time)
- Multi-language broadcasts with translation
