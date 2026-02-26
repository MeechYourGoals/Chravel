import { useState, useCallback } from 'react';
import { requestContactPermission, readContacts, ContactMap, isDespia } from '@/native/despia';

export interface Contact {
  id: string; // Using name as ID since that's what we get from key
  name: string;
  phoneNumbers: string[];
}

export interface UseContactsResult {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'unknown' | 'granted' | 'denied';
  fetchContacts: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export const useContacts = (): UseContactsResult => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>(
    'unknown',
  );

  const requestPermission = useCallback(async () => {
    if (!isDespia()) {
      // In dev/web mode, simulate permission granted
      if (import.meta.env.DEV) {
        setPermissionStatus('granted');
        return true;
      }
      setError('Contacts access is only available on mobile app');
      return false;
    }

    try {
      const granted = await requestContactPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        setError('Permission denied');
      }
      return granted;
    } catch (err) {
      console.error('Error requesting contact permission:', err);
      setError('Failed to request permission');
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Check environment first
    if (!isDespia()) {
      if (import.meta.env.DEV) {
        // Mock data for development
        setTimeout(() => {
          const mockContacts: Contact[] = [
            { id: 'John Doe', name: 'John Doe', phoneNumbers: ['+1234567890'] },
            { id: 'Jane Smith', name: 'Jane Smith', phoneNumbers: ['+0987654321'] },
            { id: 'Alice Johnson', name: 'Alice Johnson', phoneNumbers: ['+1122334455'] },
          ];
          setContacts(mockContacts);
          setIsLoading(false);
        }, 1000);
        return;
      }

      setIsLoading(false);
      setError('Contacts access is only available on mobile app');
      return;
    }

    try {
      // Try to read contacts directly
      // Note: In some Despia implementations, we might need to request permission first explicitly
      // But readContacts usually handles the check or fails if not granted
      let rawContacts = await readContacts();

      // If null, it might be permission issue or just empty
      // If we haven't requested permission yet, try that now
      if (!rawContacts && permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (granted) {
          rawContacts = await readContacts();
        }
      }

      if (rawContacts) {
        const contactList: Contact[] = Object.entries(rawContacts).map(([name, phoneNumbers]) => ({
          id: name,
          name,
          phoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers],
        }));

        // Sort by name
        contactList.sort((a, b) => a.name.localeCompare(b.name));

        setContacts(contactList);
      } else {
        // Could be empty or failed
        setContacts([]);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, requestPermission]);

  return {
    contacts,
    isLoading,
    error,
    permissionStatus,
    fetchContacts,
    requestPermission,
  };
};
