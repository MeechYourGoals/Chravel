import UIKit
import SwiftUI
import UniformTypeIdentifiers

/// Entry point for the Chravel Share Extension.
/// Hosts the SwiftUI ShareComposerView inside a UIHostingController.
class ShareViewController: UIViewController {

    private var hostingController: UIHostingController<ShareComposerView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        let items = extensionContext?.inputItems as? [NSExtensionItem] ?? []
        let viewModel = ShareComposerViewModel(
            extensionItems: items,
            onDismiss: { [weak self] in
                self?.extensionContext?.completeRequest(returningItems: nil)
            },
            onSaved: { [weak self] item in
                self?.handleSaveComplete(item)
            }
        )

        let composerView = ShareComposerView(viewModel: viewModel)
        let hosting = UIHostingController(rootView: composerView)
        hostingController = hosting

        addChild(hosting)
        view.addSubview(hosting.view)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        hosting.didMove(toParent: self)

        // Transparent background so the share sheet style shows through
        view.backgroundColor = .clear
        hosting.view.backgroundColor = .clear
    }

    private func handleSaveComplete(_ item: SharedInboundItem) {
        // Build deep link URL for "Open in Chravel"
        if let tripId = item.selectedTripId {
            let urlString = "chravel://trip/\(tripId)?tab=\(item.selectedDestination?.rawValue ?? "chat")&shared_item=\(item.id)"
            if let url = URL(string: urlString) {
                let returnItem = NSExtensionItem()
                returnItem.userInfo = [NSExtensionJavaScriptFinalizeArgumentKey: ["deepLink": url.absoluteString]]
                extensionContext?.completeRequest(returningItems: [returnItem])
                return
            }
        }
        extensionContext?.completeRequest(returningItems: nil)
    }
}
