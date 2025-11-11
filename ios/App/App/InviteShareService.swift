import UIKit

/**
 * InviteShareService
 * 
 * Provides native iOS share sheet (UIActivityViewController) for trip invitations.
 * Supports sharing via Messages, Mail, AirDrop, and other iOS share options.
 * 
 * Usage:
 *   let service = InviteShareService()
 *   service.presentShareSheet(
 *       inviteLink: "https://chravel.app/join/abc123",
 *       tripName: "Summer Trip",
 *       from: viewController
 *   )
 */
class InviteShareService {
    /**
     * Present native iOS share sheet for trip invitation
     */
    func presentShareSheet(
        inviteLink: String,
        tripName: String,
        from viewController: UIViewController,
        sourceView: UIView? = nil,
        sourceRect: CGRect? = nil
    ) {
        let shareText = """
        You're invited to join my trip "\(tripName)"!
        
        \(inviteLink)
        
        If you have the Chravel app installed, this link will open it directly. Otherwise, you can join through your browser!
        """
        
        let activityItems: [Any] = [
            shareText,
            URL(string: inviteLink) ?? inviteLink
        ]
        
        let activityViewController = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: nil
        )
        
        // Exclude some activities that don't make sense for invites
        activityViewController.excludedActivityTypes = [
            .assignToContact,
            .saveToCameraRoll,
            .addToReadingList,
            .openInIBooks
        ]
        
        // Configure for iPad (popover)
        if let popover = activityViewController.popoverPresentationController {
            if let sourceView = sourceView {
                popover.sourceView = sourceView
                popover.sourceRect = sourceRect ?? sourceView.bounds
            } else {
                popover.sourceView = viewController.view
                popover.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
        }
        
        // Completion handler
        activityViewController.completionWithItemsHandler = { activityType, completed, returnedItems, error in
            if let error = error {
                print("❌ Share error: \(error.localizedDescription)")
            } else if completed {
                print("✅ Share completed via \(activityType?.rawValue ?? "unknown")")
            }
        }
        
        viewController.present(activityViewController, animated: true)
    }
    
    /**
     * Present share sheet with contact selection
     * Combines contacts picker with share sheet
     */
    func presentShareSheetWithContacts(
        inviteLink: String,
        tripName: String,
        contacts: [ContactInfo],
        from viewController: UIViewController,
        onContactSelected: @escaping (ContactInfo) -> Void
    ) {
        // Create alert to select contact or use share sheet
        let alert = UIAlertController(
            title: "Invite to Trip",
            message: "Choose how you'd like to invite people",
            preferredStyle: .actionSheet
        )
        
        // Add contact options
        for contact in contacts.prefix(5) {
            alert.addAction(UIAlertAction(title: contact.displayName, style: .default) { _ in
                onContactSelected(contact)
            })
        }
        
        // Add "More Contacts" option if there are more
        if contacts.count > 5 {
            alert.addAction(UIAlertAction(title: "See All Contacts...", style: .default) { _ in
                // Present contacts picker or navigate to contacts view
                self.presentShareSheet(inviteLink: inviteLink, tripName: tripName, from: viewController)
            })
        }
        
        // Add share sheet option
        alert.addAction(UIAlertAction(title: "Share via...", style: .default) { _ in
            self.presentShareSheet(inviteLink: inviteLink, tripName: tripName, from: viewController)
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        // Configure for iPad
        if let popover = alert.popoverPresentationController {
            popover.sourceView = viewController.view
            popover.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        
        viewController.present(alert, animated: true)
    }
}
