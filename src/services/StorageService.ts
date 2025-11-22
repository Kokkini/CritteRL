/**
 * StorageService - Browser storage abstraction
 * Handles localStorage and IndexedDB with quota monitoring
 */

import type { StorageUsage } from '../utils/types';
import { GameConstants } from '../utils/constants';

const DB_NAME = 'critterl_db';
const DB_VERSION = 1;

// Object stores
const STORE_TRAINED_MODELS = 'trained_models';
const STORE_TRAINING_SESSIONS = 'training_sessions';
const STORE_PERFORMANCE_METRICS = 'performance_metrics';

export class StorageService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_TRAINED_MODELS)) {
          db.createObjectStore(STORE_TRAINED_MODELS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_TRAINING_SESSIONS)) {
          db.createObjectStore(STORE_TRAINING_SESSIONS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_PERFORMANCE_METRICS)) {
          const metricsStore = db.createObjectStore(STORE_PERFORMANCE_METRICS, {
            keyPath: 'modelId',
          });
          metricsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get current storage usage
   */
  async getStorageUsage(): Promise<StorageUsage> {
    if (!navigator.storage || !navigator.storage.estimate) {
      // Fallback for browsers without storage estimate API
      return {
        used: 0,
        quota: 0,
        percentage: 0,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return {
        used,
        quota,
        percentage,
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        used: 0,
        quota: 0,
        percentage: 0,
      };
    }
  }

  /**
   * Check if approaching quota limit (80%)
   */
  async isApproachingQuota(): Promise<boolean> {
    const usage = await this.getStorageUsage();
    return usage.percentage >= GameConstants.STORAGE_WARNING_THRESHOLD * 100;
  }

  /**
   * Get available storage space
   */
  async getAvailableSpace(): Promise<number> {
    const usage = await this.getStorageUsage();
    return Math.max(0, usage.quota - usage.used);
  }

  /**
   * Save to localStorage
   */
  async saveToLocalStorage(key: string, data: unknown): Promise<void> {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(key, json);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new QuotaExceededError('Storage quota exceeded');
      }
      throw new StorageUnavailableError('Failed to save to localStorage');
    }
  }

  /**
   * Load from localStorage
   */
  async loadFromLocalStorage<T>(key: string): Promise<T | null> {
    try {
      const json = localStorage.getItem(key);
      if (json === null) {
        return null;
      }
      return JSON.parse(json) as T;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Save to IndexedDB
   */
  async saveToIndexedDB(store: string, data: unknown): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new StorageUnavailableError('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        if (request.error?.name === 'QuotaExceededError') {
          reject(new QuotaExceededError('Storage quota exceeded'));
        } else {
          reject(new StorageUnavailableError('Failed to save to IndexedDB'));
        }
      };
    });
  }

  /**
   * Load from IndexedDB
   */
  async loadFromIndexedDB<T>(store: string, id: string): Promise<T | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new StorageUnavailableError('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve((request.result as T) || null);
      };
      request.onerror = () => {
        reject(new StorageUnavailableError('Failed to load from IndexedDB'));
      };
    });
  }

  /**
   * Get all items from IndexedDB store
   */
  async getAllFromIndexedDB<T>(store: string): Promise<T[]> {
    if (!this.db) {
      console.log('[StorageService] Initializing database...');
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('[StorageService] Database not initialized after initialization attempt');
        reject(new StorageUnavailableError('Database not initialized'));
        return;
      }

      console.log('[StorageService] Getting all items from store:', store);
      const transaction = this.db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const result = (request.result as T[]) || [];
        console.log('[StorageService] Retrieved', result.length, 'items from store', store);
        resolve(result);
      };
      request.onerror = () => {
        console.error('[StorageService] Error getting all items:', request.error);
        reject(new StorageUnavailableError('Failed to load all from IndexedDB'));
      };
    });
  }

  /**
   * Delete from IndexedDB
   */
  async deleteFromIndexedDB(store: string, id: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new StorageUnavailableError('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new StorageUnavailableError('Failed to delete from IndexedDB'));
      };
    });
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    // Clear localStorage
    localStorage.clear();

    // Clear IndexedDB
    if (this.db) {
      const stores = [
        STORE_TRAINED_MODELS,
        STORE_TRAINING_SESSIONS,
        STORE_PERFORMANCE_METRICS,
      ];

      for (const store of stores) {
        const transaction = this.db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        await new Promise<void>((resolve, reject) => {
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  }
}

// Error classes
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

// Export store names for use by other services
export const STORES = {
  TRAINED_MODELS: STORE_TRAINED_MODELS,
  TRAINING_SESSIONS: STORE_TRAINING_SESSIONS,
  PERFORMANCE_METRICS: STORE_PERFORMANCE_METRICS,
};

