import Foundation
import Contacts
import UIKit

/**
 * InviteContactsService
 * 
 * Provides access to device contacts for trip invitation suggestions.
 * Handles permission requests and contact fetching.
 * 
 * Usage:
 *   let service = InviteContactsService()
 *   service.requestAccess { granted in
 *       if granted {
 *           service.fetchContacts { contacts in
 *               // Use contacts for invite suggestions
 *           }
 *       }
 *   }
 */
class InviteContactsService {
    private let contactStore = CNContactStore()
    
    /**
     * Request access to contacts
     */
    func requestAccess(completion: @escaping (Bool) -> Void) {
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        
        switch authorizationStatus {
        case .authorized:
            completion(true)
        case .notDetermined:
            contactStore.requestAccess(for: .contacts) { granted, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("❌ Error requesting contacts access: \(error.localizedDescription)")
                        completion(false)
                    } else {
                        completion(granted)
                    }
                }
            }
        case .denied, .restricted:
            completion(false)
        @unknown default:
            completion(false)
        }
    }
    
    /**
     * Fetch contacts with email addresses
     * Returns array of contact info suitable for invitations
     */
    func fetchContacts(completion: @escaping ([ContactInfo]) -> Void) {
        guard CNContactStore.authorizationStatus(for: .contacts) == .authorized else {
            completion([])
            return
        }
        
        DispatchQueue.global(qos: .userInitiated).async {
            var contacts: [ContactInfo] = []
            let keys: [CNKeyDescriptor] = [
                CNContactGivenNameKey as CNKeyDescriptor,
                CNContactFamilyNameKey as CNKeyDescriptor,
                CNContactEmailAddressesKey as CNKeyDescriptor,
                CNContactPhoneNumbersKey as CNKeyDescriptor,
                CNContactImageDataKey as CNKeyDescriptor,
                CNContactThumbnailImageDataKey as CNKeyDescriptor
            ]
            
            let request = CNContactFetchRequest(keysToFetch: keys)
            request.sortOrder = .givenName
            
            do {
                try self.contactStore.enumerateContacts(with: request) { contact, _ in
                    // Only include contacts with email addresses
                    if !contact.emailAddresses.isEmpty {
                        let contactInfo = ContactInfo(
                            firstName: contact.givenName,
                            lastName: contact.familyName,
                            emails: contact.emailAddresses.map { $0.value as String },
                            phoneNumbers: contact.phoneNumbers.map { $0.value.stringValue },
                            thumbnailImageData: contact.thumbnailImageData
                        )
                        contacts.append(contactInfo)
                    }
                }
            } catch {
                print("❌ Error fetching contacts: \(error.localizedDescription)")
            }
            
            DispatchQueue.main.async {
                completion(contacts)
            }
        }
    }
    
    /**
     * Search contacts by name or email
     */
    func searchContacts(query: String, completion: @escaping ([ContactInfo]) -> Void) {
        fetchContacts { allContacts in
            let filtered = allContacts.filter { contact in
                let fullName = "\(contact.firstName) \(contact.lastName)".lowercased()
                let emailMatch = contact.emails.contains { $0.lowercased().contains(query.lowercased()) }
                return fullName.contains(query.lowercased()) || emailMatch
            }
            completion(filtered)
        }
    }
}

/**
 * ContactInfo struct
 * Represents a contact suitable for trip invitations
 */
struct ContactInfo {
    let firstName: String
    let lastName: String
    let emails: [String]
    let phoneNumbers: [String]
    let thumbnailImageData: Data?
    
    var displayName: String {
        let name = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? emails.first ?? "Unknown" : name
    }
    
    var primaryEmail: String? {
        return emails.first
    }
}
