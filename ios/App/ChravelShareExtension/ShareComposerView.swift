import SwiftUI

/// Main SwiftUI view for the Chravel Share Extension.
struct ShareComposerView: View {
    @ObservedObject var viewModel: ShareComposerViewModel

    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.094, green: 0.102, blue: 0.129) // #181A21
                    .ignoresSafeArea()

                Group {
                    switch viewModel.viewState {
                    case .loading:
                        loadingView
                    case .ready:
                        composerContent
                    case .saving:
                        savingView
                    case .success:
                        successView
                    case .error(let message):
                        errorView(message: message)
                    case .notSignedIn:
                        notSignedInView
                    case .noTrips:
                        noTripsView
                    case .duplicate:
                        duplicateView
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        viewModel.dismiss()
                    }
                    .foregroundColor(.white.opacity(0.7))
                }
                ToolbarItem(placement: .principal) {
                    Text("Share to Chravel")
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }
            .toolbarBackground(Color(red: 0.094, green: 0.102, blue: 0.129), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .onAppear { viewModel.onAppear() }
    }

    // MARK: - Composer Content

    private var composerContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                contentPreview
                tripPicker
                destinationSelector
                noteField
                saveButton
            }
            .padding(16)
        }
    }

    // MARK: - Content Preview

    private var contentPreview: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let thumbnail = viewModel.item.attachments.first?.thumbnailData,
               let data = Data(base64Encoded: thumbnail),
               let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 120)
                    .clipped()
                    .cornerRadius(8)
            }

            if let title = viewModel.item.previewTitle {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white)
                    .lineLimit(2)
            }

            if let subtitle = viewModel.item.previewSubtitle {
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(1)
            }

            if !viewModel.item.attachments.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "paperclip")
                        .font(.caption2)
                    Text("\(viewModel.item.attachments.count) attachment\(viewModel.item.attachments.count == 1 ? "" : "s")")
                        .font(.caption)
                }
                .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06))
        .cornerRadius(12)
    }

    // MARK: - Trip Picker

    private var tripPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Trip")
                .font(.caption.weight(.medium))
                .foregroundColor(.white.opacity(0.5))
                .textCase(.uppercase)

            if !viewModel.searchQuery.isEmpty || viewModel.trips.count > 5 {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.white.opacity(0.4))
                    TextField("Search trips", text: $viewModel.searchQuery)
                        .foregroundColor(.white)
                        .font(.subheadline)
                }
                .padding(10)
                .background(Color.white.opacity(0.06))
                .cornerRadius(8)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(viewModel.filteredTrips) { trip in
                        tripChip(trip)
                    }
                }
            }
        }
    }

    private func tripChip(_ trip: TripInfo) -> some View {
        let isSelected = viewModel.selectedTrip?.id == trip.id
        return Button {
            viewModel.selectTrip(trip)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(trip.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(isSelected ? .black : .white)
                    .lineLimit(1)
                Text(trip.displaySubtitle)
                    .font(.caption2)
                    .foregroundColor(isSelected ? .black.opacity(0.7) : .white.opacity(0.5))
                    .lineLimit(1)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(isSelected ? goldAccent : Color.white.opacity(0.08))
            .cornerRadius(10)
        }
    }

    // MARK: - Destination Selector

    private var destinationSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Destination")
                    .font(.caption.weight(.medium))
                    .foregroundColor(.white.opacity(0.5))
                    .textCase(.uppercase)

                Spacer()

                if let decision = viewModel.routingDecision {
                    Text(decision.reason)
                        .font(.caption2)
                        .foregroundColor(goldAccent)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ShareDestination.allCases) { destination in
                        destinationPill(destination)
                    }
                }
            }
        }
    }

    private func destinationPill(_ destination: ShareDestination) -> some View {
        let isSelected = viewModel.selectedDestination == destination
        let isSuggested = viewModel.routingDecision?.suggestedDestination == destination

        return Button {
            viewModel.selectedDestination = destination
        } label: {
            HStack(spacing: 6) {
                Image(systemName: destination.iconName)
                    .font(.caption)
                Text(destination.displayName)
                    .font(.caption.weight(.medium))
                if isSuggested && !isSelected {
                    Image(systemName: "sparkle")
                        .font(.caption2)
                        .foregroundColor(goldAccent)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .foregroundColor(isSelected ? .black : .white.opacity(0.8))
            .background(isSelected ? goldAccent : Color.white.opacity(0.08))
            .cornerRadius(8)
        }
    }

    // MARK: - Note Field

    private var noteField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Note (optional)")
                .font(.caption.weight(.medium))
                .foregroundColor(.white.opacity(0.5))
                .textCase(.uppercase)

            TextField("Add a note...", text: $viewModel.userNote, axis: .vertical)
                .lineLimit(1...4)
                .font(.subheadline)
                .foregroundColor(.white)
                .padding(12)
                .background(Color.white.opacity(0.06))
                .cornerRadius(10)
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            viewModel.save()
        } label: {
            HStack {
                Image(systemName: "arrow.up.circle.fill")
                Text("Save to \(viewModel.selectedTrip?.title ?? "Trip")")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundColor(.black)
            .background(goldAccent)
            .cornerRadius(12)
        }
        .disabled(viewModel.selectedTrip == nil)
        .opacity(viewModel.selectedTrip == nil ? 0.4 : 1.0)
    }

    // MARK: - State Views

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(.white)
            Text("Loading...")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
        }
    }

    private var savingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(goldAccent)
            Text("Saving...")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
        }
    }

    private var successView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.green)

            Text("Saved!")
                .font(.title3.weight(.semibold))
                .foregroundColor(.white)

            if let trip = viewModel.selectedTrip {
                Text("Added to \(trip.title) → \(viewModel.selectedDestination.displayName)")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 12) {
                Button("Done") {
                    viewModel.dismiss()
                }
                .buttonStyle(SecondaryShareButtonStyle())

                Button("Open in Chravel") {
                    viewModel.openInChravel()
                }
                .buttonStyle(PrimaryShareButtonStyle())
            }
            .padding(.top, 8)
        }
        .padding(24)
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundColor(.orange)

            Text("Something went wrong")
                .font(.headline)
                .foregroundColor(.white)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            Button("Try Again") {
                viewModel.onAppear()
            }
            .buttonStyle(PrimaryShareButtonStyle())
        }
        .padding(24)
    }

    private var notSignedInView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 40))
                .foregroundColor(.orange)

            Text("Sign in Required")
                .font(.headline)
                .foregroundColor(.white)

            Text("Open Chravel and sign in to share content to your trips.")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            Button("Done") {
                viewModel.dismiss()
            }
            .buttonStyle(SecondaryShareButtonStyle())
        }
        .padding(24)
    }

    private var noTripsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "suitcase")
                .font(.system(size: 40))
                .foregroundColor(.white.opacity(0.4))

            Text("No Trips Yet")
                .font(.headline)
                .foregroundColor(.white)

            Text("Create a trip in Chravel first, then come back to share content.")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            Button("Done") {
                viewModel.dismiss()
            }
            .buttonStyle(SecondaryShareButtonStyle())
        }
        .padding(24)
    }

    private var duplicateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.on.doc")
                .font(.system(size: 40))
                .foregroundColor(goldAccent)

            Text("Already Shared")
                .font(.headline)
                .foregroundColor(.white)

            Text("This content was recently shared to Chravel.")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            HStack(spacing: 12) {
                Button("Cancel") {
                    viewModel.dismiss()
                }
                .buttonStyle(SecondaryShareButtonStyle())

                Button("Share Anyway") {
                    viewModel.saveAnyway()
                }
                .buttonStyle(PrimaryShareButtonStyle())
            }
        }
        .padding(24)
    }

    // MARK: - Theme

    private var goldAccent: Color {
        Color(red: 0.82, green: 0.68, blue: 0.42) // Chravel gold
    }
}

// MARK: - Button Styles

struct PrimaryShareButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .foregroundColor(.black)
            .background(Color(red: 0.82, green: 0.68, blue: 0.42))
            .cornerRadius(10)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}

struct SecondaryShareButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .foregroundColor(.white.opacity(0.8))
            .background(Color.white.opacity(0.1))
            .cornerRadius(10)
            .opacity(configuration.isPressed ? 0.6 : 1.0)
    }
}
