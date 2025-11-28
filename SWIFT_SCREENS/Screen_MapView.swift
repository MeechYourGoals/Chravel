// MapView.swift
// Chravel iOS - Map Screen with Places Search
// Generated from MSPEC

import SwiftUI
import MapKit

// MARK: - Map Mode

enum MapMode: String, CaseIterable {
    case tripBase = "Trip Base"
    case personalBase = "Personal Base"
    case explore = "Explore"
}

// MARK: - Map View

struct MapView: View {
    // MARK: - Parameters
    let tripId: String?
    let initialCenter: CLLocationCoordinate2D?
    
    // MARK: - Environment
    @Environment(AuthViewModel.self) private var authViewModel
    
    // MARK: - State
    @State private var viewModel: MapViewModel
    @State private var camera: MapCameraPosition
    @State private var selectedPlace: PlaceData?
    @State private var showPlaceDetail: Bool = false
    @State private var showSearch: Bool = false
    @State private var showFilters: Bool = false
    
    // MARK: - Init
    
    init(tripId: String? = nil, initialCenter: CLLocationCoordinate2D? = nil) {
        self.tripId = tripId
        self.initialCenter = initialCenter
        
        let defaultCenter = initialCenter ?? CLLocationCoordinate2D(latitude: 34.0522, longitude: -118.2437)
        _camera = State(initialValue: .region(MKCoordinateRegion(
            center: defaultCenter,
            span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
        )))
        _viewModel = State(wrappedValue: MapViewModel(tripId: tripId))
    }
    
    // MARK: - Body
    
    var body: some View {
        @Bindable var viewModel = viewModel
        
        ZStack {
            // Map
            Map(position: $camera, selection: $selectedPlace) {
                // User Location
                UserAnnotation()
                
                // Trip Places
                ForEach(viewModel.tripPlaces) { place in
                    if let lat = place.latitude, let lng = place.longitude {
                        Marker(
                            place.name,
                            systemImage: iconForPlaceType(place.types?.first),
                            coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
                        )
                        .tint(.chravelOrange)
                        .tag(place)
                    }
                }
                
                // Search Results
                ForEach(viewModel.searchResults) { place in
                    if let lat = place.latitude, let lng = place.longitude {
                        Marker(
                            place.name,
                            systemImage: iconForPlaceType(place.types?.first),
                            coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
                        )
                        .tint(.purple)
                        .tag(place)
                    }
                }
            }
            .mapStyle(.standard(elevation: .realistic))
            .mapControls {
                MapUserLocationButton()
                MapCompass()
                MapScaleView()
            }
            .ignoresSafeArea()
            
            // Overlays
            VStack(spacing: 0) {
                // Search Bar
                MapSearchBar(
                    query: $viewModel.searchQuery,
                    isSearching: viewModel.isSearching,
                    onSearch: {
                        Task {
                            await viewModel.search()
                        }
                    },
                    onClear: {
                        viewModel.clearSearch()
                    }
                )
                .padding(ChravelSpacing.md)
                
                // Mode Selector
                if tripId != nil {
                    MapModeSelector(mode: $viewModel.mode)
                        .padding(.horizontal, ChravelSpacing.md)
                }
                
                // Category Filters
                CategoryFilterBar(
                    selectedCategory: $viewModel.selectedCategory,
                    onCategoryChange: { category in
                        Task {
                            await viewModel.filterByCategory(category)
                        }
                    }
                )
                .padding(.horizontal, ChravelSpacing.md)
                .padding(.top, ChravelSpacing.sm)
                
                Spacer()
                
                // Place Cards (when search results exist)
                if !viewModel.searchResults.isEmpty {
                    PlaceCardsCarousel(
                        places: viewModel.searchResults,
                        selectedPlace: $selectedPlace,
                        onPlaceTap: { place in
                            selectPlace(place)
                        },
                        onAddToTrip: { place in
                            Task {
                                await viewModel.addPlaceToTrip(place)
                            }
                        }
                    )
                }
            }
            
            // Loading Overlay
            if viewModel.isSearching {
                VStack {
                    Spacer()
                    HStack {
                        ProgressView()
                            .tint(.chravelOrange)
                        Text("Searching...")
                            .font(ChravelTypography.caption)
                            .foregroundColor(.textSecondary)
                    }
                    .padding(ChravelSpacing.sm)
                    .background(Color.glassWhite)
                    .clipShape(Capsule())
                    .padding(.bottom, 100)
                }
            }
        }
        .navigationTitle("Map")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: selectedPlace) { _, newPlace in
            if let place = newPlace {
                centerOnPlace(place)
            }
        }
        .sheet(isPresented: $showPlaceDetail) {
            if let place = selectedPlace {
                PlaceDetailSheet(
                    place: place,
                    tripId: tripId,
                    onAddToTrip: {
                        Task {
                            await viewModel.addPlaceToTrip(place)
                        }
                    }
                )
                .presentationDetents([.medium, .large])
            }
        }
        .task {
            await viewModel.loadTripPlaces()
            await viewModel.requestLocationPermission()
        }
    }
    
    // MARK: - Helpers
    
    private func selectPlace(_ place: PlaceData) {
        selectedPlace = place
        centerOnPlace(place)
        ChravelHaptics.selection()
    }
    
    private func centerOnPlace(_ place: PlaceData) {
        guard let lat = place.latitude, let lng = place.longitude else { return }
        
        withAnimation(.easeInOut(duration: 0.5)) {
            camera = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            ))
        }
    }
    
    private func iconForPlaceType(_ type: String?) -> String {
        switch type {
        case "restaurant": return "fork.knife"
        case "cafe": return "cup.and.saucer.fill"
        case "bar": return "wineglass.fill"
        case "hotel", "lodging": return "bed.double.fill"
        case "museum": return "building.columns.fill"
        case "park": return "leaf.fill"
        case "airport": return "airplane"
        case "transit_station": return "tram.fill"
        default: return "mappin"
        }
    }
}

// MARK: - Map Search Bar

struct MapSearchBar: View {
    @Binding var query: String
    let isSearching: Bool
    let onSearch: () -> Void
    let onClear: () -> Void
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        HStack(spacing: ChravelSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textMuted)
            
            TextField("Search places...", text: $query)
                .font(ChravelTypography.body)
                .foregroundColor(.textPrimary)
                .focused($isFocused)
                .submitLabel(.search)
                .onSubmit {
                    onSearch()
                }
            
            if !query.isEmpty {
                Button {
                    query = ""
                    onClear()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textMuted)
                }
            }
            
            if isSearching {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(ChravelSpacing.sm)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.lg))
        .shadow(color: .black.opacity(0.1), radius: 8)
    }
}

// MARK: - Map Mode Selector

struct MapModeSelector: View {
    @Binding var mode: MapMode
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(MapMode.allCases, id: \.self) { mapMode in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        mode = mapMode
                    }
                    ChravelHaptics.selection()
                } label: {
                    Text(mapMode.rawValue)
                        .font(ChravelTypography.captionSmall)
                        .fontWeight(mode == mapMode ? .semibold : .regular)
                        .foregroundColor(mode == mapMode ? .white : .textSecondary)
                        .padding(.horizontal, ChravelSpacing.sm)
                        .padding(.vertical, ChravelSpacing.xs)
                        .background(
                            mode == mapMode ? Color.chravelOrange : Color.clear
                        )
                        .clipShape(Capsule())
                }
            }
        }
        .padding(ChravelSpacing.xxs)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }
}

// MARK: - Category Filter Bar

struct CategoryFilterBar: View {
    @Binding var selectedCategory: PlaceCategory?
    let onCategoryChange: (PlaceCategory?) -> Void
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ChravelSpacing.xs) {
                CategoryChip(
                    category: nil,
                    isSelected: selectedCategory == nil,
                    label: "All"
                ) {
                    selectedCategory = nil
                    onCategoryChange(nil)
                }
                
                ForEach(PlaceCategory.allCases, id: \.self) { category in
                    CategoryChip(
                        category: category,
                        isSelected: selectedCategory == category,
                        label: category.displayName
                    ) {
                        selectedCategory = category
                        onCategoryChange(category)
                    }
                }
            }
        }
    }
}

struct CategoryChip: View {
    let category: PlaceCategory?
    let isSelected: Bool
    let label: String
    let action: () -> Void
    
    var body: some View {
        Button {
            ChravelHaptics.selection()
            action()
        } label: {
            HStack(spacing: ChravelSpacing.xxs) {
                if let category {
                    Image(systemName: category.icon)
                        .font(.system(size: 12))
                }
                Text(label)
                    .font(ChravelTypography.captionSmall)
            }
            .foregroundColor(isSelected ? .white : .textSecondary)
            .padding(.horizontal, ChravelSpacing.sm)
            .padding(.vertical, ChravelSpacing.xs)
            .background(isSelected ? Color.chravelOrange : Color.glassWhite)
            .clipShape(Capsule())
        }
    }
}

// MARK: - Place Category

enum PlaceCategory: String, CaseIterable {
    case restaurants
    case hotels
    case attractions
    case shopping
    case nightlife
    case outdoors
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var icon: String {
        switch self {
        case .restaurants: return "fork.knife"
        case .hotels: return "bed.double"
        case .attractions: return "star"
        case .shopping: return "bag"
        case .nightlife: return "moon.stars"
        case .outdoors: return "leaf"
        }
    }
    
    var googleTypes: [String] {
        switch self {
        case .restaurants: return ["restaurant", "cafe", "bar"]
        case .hotels: return ["lodging", "hotel"]
        case .attractions: return ["tourist_attraction", "museum", "art_gallery"]
        case .shopping: return ["shopping_mall", "store"]
        case .nightlife: return ["night_club", "bar"]
        case .outdoors: return ["park", "natural_feature"]
        }
    }
}

// MARK: - Place Cards Carousel

struct PlaceCardsCarousel: View {
    let places: [PlaceData]
    @Binding var selectedPlace: PlaceData?
    let onPlaceTap: (PlaceData) -> Void
    let onAddToTrip: (PlaceData) -> Void
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: ChravelSpacing.md) {
                ForEach(places) { place in
                    PlaceCard(
                        place: place,
                        isSelected: selectedPlace?.id == place.id,
                        onTap: { onPlaceTap(place) },
                        onAdd: { onAddToTrip(place) }
                    )
                }
            }
            .padding(.horizontal, ChravelSpacing.md)
        }
        .frame(height: 160)
        .padding(.bottom, ChravelSpacing.lg)
    }
}

struct PlaceCard: View {
    let place: PlaceData
    let isSelected: Bool
    let onTap: () -> Void
    let onAdd: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
            // Image or placeholder
            ZStack {
                if let photoUrl = place.photoUrl {
                    AsyncImage(url: URL(string: photoUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        placeholderView
                    }
                } else {
                    placeholderView
                }
            }
            .frame(height: 80)
            .clipped()
            
            VStack(alignment: .leading, spacing: 2) {
                Text(place.name)
                    .font(ChravelTypography.label)
                    .foregroundColor(.textPrimary)
                    .lineLimit(1)
                
                if let rating = place.rating {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.chravelGold)
                        Text(String(format: "%.1f", rating))
                            .font(ChravelTypography.captionSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .padding(.horizontal, ChravelSpacing.xs)
            
            // Add button
            Button {
                ChravelHaptics.light()
                onAdd()
            } label: {
                Text("Add")
                    .font(ChravelTypography.captionSmall)
                    .fontWeight(.semibold)
                    .foregroundColor(.chravelOrange)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, ChravelSpacing.xxs)
                    .background(Color.chravelOrange.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.sm))
            }
            .padding(.horizontal, ChravelSpacing.xs)
            .padding(.bottom, ChravelSpacing.xs)
        }
        .frame(width: 160)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ChravelRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: ChravelRadius.md)
                .stroke(isSelected ? Color.chravelOrange : Color.clear, lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.1), radius: 4)
        .onTapGesture {
            onTap()
        }
    }
    
    private var placeholderView: some View {
        Rectangle()
            .fill(Color.chravelDarkGray)
            .overlay(
                Image(systemName: "mappin.circle")
                    .font(.system(size: 24))
                    .foregroundColor(.textMuted)
            )
    }
}

// MARK: - Place Detail Sheet

struct PlaceDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    let place: PlaceData
    let tripId: String?
    let onAddToTrip: () -> Void
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: ChravelSpacing.md) {
                    // Header Image
                    if let photoUrl = place.photoUrl {
                        AsyncImage(url: URL(string: photoUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(Color.chravelDarkGray)
                        }
                        .frame(height: 200)
                        .clipped()
                    }
                    
                    VStack(alignment: .leading, spacing: ChravelSpacing.md) {
                        // Name and Rating
                        HStack {
                            VStack(alignment: .leading, spacing: ChravelSpacing.xxs) {
                                Text(place.name)
                                    .font(ChravelTypography.title2)
                                    .foregroundColor(.textPrimary)
                                
                                if let types = place.types, !types.isEmpty {
                                    Text(types.prefix(2).joined(separator: " • ").capitalized)
                                        .font(ChravelTypography.caption)
                                        .foregroundColor(.textMuted)
                                }
                            }
                            
                            Spacer()
                            
                            if let rating = place.rating {
                                VStack(alignment: .trailing, spacing: 2) {
                                    HStack(spacing: 2) {
                                        Text(String(format: "%.1f", rating))
                                            .font(ChravelTypography.headline)
                                            .foregroundColor(.textPrimary)
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.chravelGold)
                                    }
                                    
                                    if let count = place.userRatingsTotal {
                                        Text("\(count) reviews")
                                            .font(ChravelTypography.captionSmall)
                                            .foregroundColor(.textMuted)
                                    }
                                }
                            }
                        }
                        
                        Divider()
                        
                        // Address
                        if let address = place.address {
                            HStack(alignment: .top, spacing: ChravelSpacing.sm) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(.chravelOrange)
                                Text(address)
                                    .font(ChravelTypography.body)
                                    .foregroundColor(.textSecondary)
                            }
                        }
                        
                        // Phone
                        if let phone = place.phoneNumber {
                            HStack(spacing: ChravelSpacing.sm) {
                                Image(systemName: "phone.fill")
                                    .foregroundColor(.chravelOrange)
                                Text(phone)
                                    .font(ChravelTypography.body)
                                    .foregroundColor(.textSecondary)
                            }
                        }
                        
                        // Website
                        if let website = place.websiteUrl, let url = URL(string: website) {
                            Link(destination: url) {
                                HStack(spacing: ChravelSpacing.sm) {
                                    Image(systemName: "globe")
                                        .foregroundColor(.chravelOrange)
                                    Text("Visit Website")
                                        .font(ChravelTypography.body)
                                        .foregroundColor(.chravelOrange)
                                }
                            }
                        }
                        
                        // Opening Hours
                        if let hours = place.openingHours {
                            VStack(alignment: .leading, spacing: ChravelSpacing.xs) {
                                HStack {
                                    Image(systemName: "clock.fill")
                                        .foregroundColor(.chravelOrange)
                                    Text("Hours")
                                        .font(ChravelTypography.label)
                                        .foregroundColor(.textPrimary)
                                }
                                
                                ForEach(hours, id: \.self) { hour in
                                    Text(hour)
                                        .font(ChravelTypography.caption)
                                        .foregroundColor(.textSecondary)
                                }
                            }
                        }
                        
                        // Actions
                        if tripId != nil {
                            ChravelButton(title: "Add to Trip", style: .primary) {
                                onAddToTrip()
                                dismiss()
                            }
                        }
                        
                        // Open in Maps
                        if let lat = place.latitude, let lng = place.longitude {
                            ChravelButton(title: "Open in Maps", style: .secondary) {
                                let url = URL(string: "maps://?ll=\(lat),\(lng)")!
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                    .padding(ChravelSpacing.md)
                }
            }
            .background(Color.chravelBlack)
            .navigationTitle("Place Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.textMuted)
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        MapView(tripId: "preview")
    }
    .environment(AuthViewModel())
    .preferredColorScheme(.dark)
}
