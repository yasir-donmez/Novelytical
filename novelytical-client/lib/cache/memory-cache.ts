/**
 * Memory Cache Layer
 * 
 * Fast, volatile cache stored in memory with LRU eviction policy
 */

import { CacheLayer, CacheMetadata, CacheConfig } from './cache-manager';

interface MemoryCacheEntry<T = any> {
  value: T;
  metadata: CacheMetadata;
}

export class MemoryCache implements CacheLayer {
  private cache = new Map<string, MemoryCacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private stats = {
    hitCount: 0,
    missCount: 0,
    totalSize: 0
  };
  
  constructor(
    private config: CacheConfig,
    private maxSizeBytes: number = 50 * 1024 * 1024 // 50MB default
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now > entry.metadata.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.missCount++;
      return null;
    }

    // Update access tracking
    entry.metadata.lastAccessed = now;
    entry.metadata.accessCount++;
    this.accessOrder.set(key, now);
    this.stats.hitCount++;

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const serializedValue = JSON.stringify(value);
    const size = new Blob([serializedValue]).size;

    // Check if we need to evict entries
    await this.ensureSpace(size);

    const metadata: CacheMetadata = {
      key,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now,
      size,
      dataType: this.inferDataType(key)
    };

    // Apply compression if enabled and beneficial
    let finalValue = value;
    if (this.config.compressionEnabled && size > 1024) { // Compress if > 1KB
      try {
        const compressed = await this.compress(serializedValue);
        if (compressed.length < serializedValue.length * 0.8) { // Only if 20%+ reduction
          finalValue = compressed as T;
          metadata.compressionRatio = compressed.length / serializedValue.length;
        }
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    this.cache.set(key, { value: finalValue, metadata });
    this.accessOrder.set(key, now);
    this.stats.totalSize += size;
  }

  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= entry.metadata.size;
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats.totalSize = 0;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.metadata.expiresAt) {
      await this.delete(key);
      return false;
    }
    
    return true;
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
      entryCount: this.cache.size
    };
  }

  // Get metadata for a specific key
  getMetadata(key: string): CacheMetadata | null {
    const entry = this.cache.get(key);
    return entry ? entry.metadata : null;
  }

  // Clean up expired entries
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.metadata.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  // Ensure we have enough space, evict LRU entries if needed
  private async ensureSpace(requiredSize: number): Promise<void> {
    if (this.stats.totalSize + requiredSize <= this.maxSizeBytes) {
      return;
    }

    // Sort by access time (LRU first)
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1]);

    // Evict LRU entries until we have enough space
    for (const [key] of sortedEntries) {
      await this.delete(key);
      
      if (this.stats.totalSize + requiredSize <= this.maxSizeBytes) {
        break;
      }
    }
  }

  // Infer data type from cache key
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

  // Simple compression using built-in compression
  private async compress(data: string): Promise<string> {
    // In a real implementation, you might use a library like pako for gzip compression
    // For now, we'll use a simple approach
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const compressed = encoder.encode(data);
      return decoder.decode(compressed);
    } catch (error) {
      throw new Error('Compression failed');
    }
  }

  // Invalidate entries matching a pattern
  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }
}