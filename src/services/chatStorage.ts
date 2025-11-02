/**
 * IndexedDB storage for offline chat caching
 * Provides instant load and offline viewing capability
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatMessage {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  trip_id: string;
  privacy_mode?: string;
  [key: string]: any;
}

interface ChatDB extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-trip': string; 'by-date': string };
  };
}

const DB_NAME = 'chravel-chat-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ChatDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ChatDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by-trip', 'trip_id');
        store.createIndex('by-date', 'created_at');
      }
    },
  });

  return dbInstance;
}

export async function saveMessagesToCache(tripId: string, messages: ChatMessage[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all(messages.map(msg => tx.store.put({ ...msg, trip_id: tripId })));
    await tx.done;
  } catch (error) {
    console.error('Failed to cache messages:', error);
  }
}

export async function loadMessagesFromCache(tripId: string): Promise<ChatMessage[]> {
  try {
    const db = await getDB();
    const messages = await db.getAllFromIndex('messages', 'by-trip', tripId);
    return messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (error) {
    console.error('Failed to load cached messages:', error);
    return [];
  }
}

export async function clearCachedMessages(tripId?: string): Promise<void> {
  try {
    const db = await getDB();
    if (tripId) {
      const messages = await db.getAllFromIndex('messages', 'by-trip', tripId);
      const tx = db.transaction('messages', 'readwrite');
      await Promise.all(messages.map(msg => tx.store.delete(msg.id)));
      await tx.done;
    } else {
      await db.clear('messages');
    }
  } catch (error) {
    console.error('Failed to clear cached messages:', error);
  }
}
