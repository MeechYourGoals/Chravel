/**
 * IndexedDB storage for offline chat caching
 * Provides instant load and offline viewing capability
 * Caches last 30 days of messages for offline reading
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatMessage {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  trip_id: string;
  privacy_mode?: string;
  version?: number;
  [key: string]: any;
}

interface ChatDB extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-trip': string; 'by-date': string; 'by-created-at': string };
  };
}

const DB_NAME = 'chravel-chat-db';
const DB_VERSION = 2; // Incremented for new index
const CACHE_EXPIRY_DAYS = 30;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

let dbInstance: IDBPDatabase<ChatDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ChatDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by-trip', 'trip_id');
        store.createIndex('by-date', 'created_at');
        store.createIndex('by-created-at', 'created_at');
      } else if (oldVersion < 2) {
        // Add new index for version 2
        const store = db.transaction.objectStore('messages');
        if (!store.indexNames.contains('by-created-at')) {
          store.createIndex('by-created-at', 'created_at');
        }
      }
    },
  });

  return dbInstance;
}

export async function saveMessagesToCache(tripId: string, messages: ChatMessage[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const now = Date.now();
    
    // Filter messages to only cache last 30 days
    const thirtyDaysAgo = new Date(now - CACHE_EXPIRY_MS);
    
    const messagesToCache = messages.filter(msg => {
      const msgDate = new Date(msg.created_at);
      return msgDate >= thirtyDaysAgo;
    });

    await Promise.all(
      messagesToCache.map(msg => 
        tx.store.put({ 
          ...msg, 
          trip_id: tripId,
          cached_at: now // Track when cached for expiry
        })
      )
    );
    await tx.done;

    // Clean up expired messages
    await cleanupExpiredMessages(db);
  } catch (error) {
    console.error('Failed to cache messages:', error);
  }
}

async function cleanupExpiredMessages(db: IDBPDatabase<ChatDB>): Promise<void> {
  try {
    const allMessages = await db.getAll('messages');
    const now = Date.now();
    const expiredCutoff = now - CACHE_EXPIRY_MS;

    const expiredMessages = allMessages.filter(msg => {
      const msgDate = new Date(msg.created_at);
      return msgDate.getTime() < expiredCutoff;
    });

    if (expiredMessages.length > 0) {
      const tx = db.transaction('messages', 'readwrite');
      await Promise.all(expiredMessages.map(msg => tx.store.delete(msg.id)));
      await tx.done;
    }
  } catch (error) {
    console.error('Failed to cleanup expired messages:', error);
  }
}

export async function loadMessagesFromCache(tripId: string): Promise<ChatMessage[]> {
  try {
    const db = await getDB();
    const allMessages = await db.getAllFromIndex('messages', 'by-trip', tripId);
    const now = Date.now();
    const expiredCutoff = now - CACHE_EXPIRY_MS;

    // Filter expired messages
    const validMessages = allMessages.filter(msg => {
      const msgDate = new Date(msg.created_at);
      return msgDate.getTime() >= expiredCutoff;
    });

    return validMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
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

/**
 * Get cache statistics for a trip
 */
export async function getCacheStats(tripId: string): Promise<{
  totalMessages: number;
  oldestMessage?: Date;
  newestMessage?: Date;
}> {
  try {
    const db = await getDB();
    const messages = await db.getAllFromIndex('messages', 'by-trip', tripId);
    
    if (messages.length === 0) {
      return { totalMessages: 0 };
    }

    const sortedMessages = messages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return {
      totalMessages: messages.length,
      oldestMessage: new Date(sortedMessages[0].created_at),
      newestMessage: new Date(sortedMessages[sortedMessages.length - 1].created_at),
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { totalMessages: 0 };
  }
}
