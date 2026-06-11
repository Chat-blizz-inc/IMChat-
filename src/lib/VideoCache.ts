/**
 * VideoCache utility using IndexedDB to cache video blobs locally.
 * This helps with faster loading and basic offline support for Reels.
 */

const DB_NAME = 'video-cache-db';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

class VideoCacheService {
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Fetches a video blob, caching it if not already cached.
   */
  async getVideoBlob(url: string): Promise<Blob> {
    const db = await this.openDB();
    const cachedBlob = await this.getFromCache(db, url);

    if (cachedBlob) {
      return cachedBlob;
    }

    const response = await fetch(url);
    const blob = await response.blob();
    
    await this.saveToCache(db, url, blob);
    return blob;
  }

  private getFromCache(db: IDBDatabase, key: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  private saveToCache(db: IDBDatabase, key: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache() {
    const db = await this.openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  }

  async getCacheSize(): Promise<string> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const blobs = request.result as Blob[];
          const totalBytes = blobs.reduce((acc, blob) => acc + blob.size, 0);
          if (totalBytes === 0) resolve('0 B');
          const k = 1024;
          const dm = 2;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(totalBytes) / Math.log(k));
          resolve(parseFloat((totalBytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]);
        };
        request.onerror = () => resolve('0 B');
      });
    } catch (e) {
      return '0 B';
    }
  }
}

export const VideoCache = new VideoCacheService();
