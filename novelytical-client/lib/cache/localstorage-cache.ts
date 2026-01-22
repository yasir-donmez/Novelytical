/**
 * LocalStorage Cache Layer
 * 
 * Persistent cache using browser localStorage with size management
 */

import { CacheLayer, CacheMetadata, CacheConfig } from './cache-manager';

interface LocalStorageCacheEntry {
  value: any;
  metadata: CacheMetadata;
}

export class LocalStorageCache implements CacheLayer {
  private stats = {
    hitCount: 0,
    missCount: 0,
    totalSize: 0
  };

  constructor(
    private config: CacheConfig,
    private maxSizeBytes: number = 100 * 1024 * 1024 // 100MB default
  ) {
    this.calculateCurrentSize();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) {
        this.stats.missCount++;
        return null;
      }

      const entry: LocalStorageCacheEntry = JSON.parse(stored);
      
      // Check if expired
      const now = Date.now();
      if (now > entry.metadata.expiresAt) {
        localStorage.removeItem(fullKey);
        this.stats.missCount++;
        return null;
      }

      // Update access tracking
      entry.metadata.lastAccessed = now;
      entry.metadata.accessCount++;
      localStorage.setItem(fullKey, JSON.stringify(entry));
      
      this.stats.hitCount++;
      return entry.value as T;
    } catch (error) {
      console.warn('LocalStorage get error:', error);
      this.stats.missCount++;
      return null;
    }
  }
  async set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      const fullKey = this.getFullKey(key);
      
      const metadata: CacheMetadata = {
        key,
        createdAt: now,
        expiresAt: now + ttl,
        accessCount: 0,
        lastAccessed: now,
        size: 0,
        dataType: this.inferDataType(key)
      };

      const entry: LocalStorageCacheEntry = { value, metadata };
      const serialized = JSON.stringify(entry);
      const size = new Blob([serialized]).size;
      
      metadata.size = size;

      // Check if we need to make space
      await this.ensureSpace(size);

      localStorage.setItem(fullKey, serialized);
      this.stats.totalSize += size;
    } catch (error: unknown) {
      console.warn('LocalStorage set error:', error);
      // If localStorage is full, try to clear some space and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.cleanup();
        try {
          const entry: LocalStorageCacheEntry = { 
            value, 
            metadata: {
              key,
              createdAt: Date.now(),
              expiresAt: Date.now() + ttl,
              accessCount: 0,
              lastAccessed: Date.now(),
              size: new Blob([JSON.stringify(value)]).size,
              dataType: this.inferDataType(key)
            }
          };
          localStorage.setItem(this.getFullKey(key), JSON.stringify(entry));
        } catch (retryError) {
          console.error('LocalStorage retry failed:', retryError);
        }
      }
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (stored) {
        const entry: LocalStorageCacheEntry = JSON.parse(stored);
        this.stats.totalSize -= entry.metadata.size;
        localStorage.removeItem(fullKey);
      }
    } catch (error) {
      console.warn('LocalStorage delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = this.getAllCacheKeys();
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      this.stats.totalSize = 0;
    } catch (error) {
      console.warn('LocalStorage clear error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) return false;
      
      const entry: LocalStorageCacheEntry = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() > entry.metadata.expiresAt) {
        localStorage.removeItem(fullKey);
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async size(): Promise<number> {
    return this.stats.totalSize;
  }

  // Get cache statistics
  getStats() {
    const total = this.stats.hitCount + this.stats.missCount;
    return {
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: total > 0 ? this.stats.hitCount / total : 0,
      size: this.stats.totalSize,
      maxSize: this.maxSizeBytes,
      entryCount: this.getAllCacheKeys().length
    };
  }

  // Clean up expired entries
  async cleanup(): Promise<void> {
    const now = Date.now();
    const keys = this.getAllCacheKeys();
    
    for (const fullKey of keys) {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const entry: LocalStorageCacheEntry = JSON.parse(stored);
          if (now > entry.metadata.expiresAt) {
            localStorage.removeItem(fullKey);
            this.stats.totalSize -= entry.metadata.size;
          }
        }
      } catch (error) {
        // Remove corrupted entries
        localStorage.removeItem(fullKey);
      }
    }
  }

  // Invalidate entries matching a pattern
  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    const keys = this.getAllCacheKeys();
    
    for (const fullKey of keys) {
      const key = fullKey.replace(this.config.localStoragePrefix, '');
      if (regex.test(key)) {
        await this.delete(key);
      }
    }
  }

  // Private helper methods
  private getFullKey(key: string): string {
    return `${this.config.localStoragePrefix}${key}`;
  }

  private getAllCacheKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.config.localStoragePrefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private calculateCurrentSize(): void {
    let totalSize = 0;
    const keys = this.getAllCacheKeys();
    
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          totalSize += new Blob([stored]).size;
        }
      } catch (error) {
        // Ignore errors for size calculation
      }
    }
    
    this.stats.totalSize = totalSize;
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    if (this.stats.totalSize + requiredSize <= this.maxSizeBytes) {
      return;
    }

    // Get all entries with their access times
    const entries: Array<{ key: string, lastAccessed: number, size: number }> = [];
    const keys = this.getAllCacheKeys();
    
    for (const fullKey of keys) {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const entry: LocalStorageCacheEntry = JSON.parse(stored);
          entries.push({
            key: fullKey.replace(this.config.localStoragePrefix, ''),
            lastAccessed: entry.metadata.lastAccessed,
            size: entry.metadata.size
          });
        }
      } catch (error) {
        // Remove corrupted entries
        localStorage.removeItem(fullKey);
      }
    }

    // Sort by last accessed (LRU first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Remove LRU entries until we have enough space
    for (const entry of entries) {
      await this.delete(entry.key);
      
      if (this.stats.totalSize + requiredSize <= this.maxSizeBytes) {
        break;
      }
    }
  }

  private inferDataType(key: string): CacheMetadata['dataType'] {
    if (key.includes('user_profile') || key.includes('user_settings')) {
      return 'user';
    }
    if (key.includes('novel_stats') || key.includes('story_tower')) {
      return 'stats';
    }
    if (key.includes('discovery') || key.includes('trending') || key.includes('editors_choice')) {
      return 'discovery';
    }
    if (key.includes('search') || key.includes('filter')) {
      return 'dynamic';
    }
    return 'static';
  }
}