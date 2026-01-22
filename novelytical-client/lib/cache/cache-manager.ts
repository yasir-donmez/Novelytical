/**
 * Multi-layered Cache Manager for Firebase Optimization
 * 
 * Provides a hierarchical caching system with:
 * 1. Memory Cache (fastest, volatile)
 * 2. LocalStorage Cache (persistent, limited size)
 * 3. React Query Cache (integrated with React lifecycle)
 */

export interface CacheConfig {
  // TTL configurations for different data types
  staticContentTTL: number; // 30-60 minutes for static content
  dynamicContentTTL: number; // 5-10 minutes for dynamic content
  userDataTTL: number; // 30 minutes for user profiles
  novelStatsTTL: number; // 60 minutes for novel statistics
  discoveryDataTTL: number; // 60 minutes for discovery lanes

  // Memory cache settings
  maxMemorySize: number; // Maximum memory cache size in MB
  compressionEnabled: boolean; // Enable compression for large objects

  // LocalStorage settings
  maxLocalStorageSize: number; // Maximum localStorage usage in MB
  localStoragePrefix: string; // Prefix for localStorage keys
}

export interface CacheMetadata {
  key: string;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressionRatio?: number;
  dataType: 'static' | 'dynamic' | 'user' | 'stats' | 'discovery';
}

export interface CacheLayer<T = any> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
}

export interface CacheManager {
  // Main cache operations
  get<T>(key: string, dataType?: string): Promise<T | null>;
  set<T>(key: string, value: T, dataType?: string, customTTL?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;

  // Cache layers access
  memory: CacheLayer;
  localStorage: CacheLayer;

  // Statistics and monitoring
  getStats(): Promise<CacheStats>;
  getMetadata(key: string): Promise<CacheMetadata | null>;
}

export interface CacheStats {
  memory: {
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
    maxSize: number;
  };
  localStorage: {
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
    maxSize: number;
  };
  overall: {
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
    avgResponseTime: number;
  };
}

// Default cache configuration optimized for Firebase reduction
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  // Optimized TTL values for 70% read reduction
  staticContentTTL: 60 * 60 * 1000, // 60 minutes (was 5 minutes)
  dynamicContentTTL: 10 * 60 * 1000, // 10 minutes (was 5 minutes)
  userDataTTL: 30 * 60 * 1000, // 30 minutes (was 5 minutes)
  novelStatsTTL: 60 * 60 * 1000, // 60 minutes (was 10 minutes)
  discoveryDataTTL: 60 * 60 * 1000, // 60 minutes (was 5 minutes)

  // Memory management
  maxMemorySize: 50, // 50MB
  compressionEnabled: false, // TODO: Enable when pako is added for real gzip compression

  // LocalStorage management
  maxLocalStorageSize: 100, // 100MB
  localStoragePrefix: 'novelytical_cache_'
};

/**
 * Get TTL for specific data type
 */
export function getTTLForDataType(dataType: string, config: CacheConfig = DEFAULT_CACHE_CONFIG): number {
  switch (dataType) {
    case 'static':
    case 'discovery':
      return config.staticContentTTL;
    case 'user':
      return config.userDataTTL;
    case 'stats':
      return config.novelStatsTTL;
    case 'dynamic':
    default:
      return config.dynamicContentTTL;
  }
}

/**
 * Cache key utilities
 */
export const CacheKeys = {
  // User data
  userProfile: (uid: string) => `user_profile_${uid}`,
  userSettings: (uid: string) => `user_settings_${uid}`,

  // Novel data
  novelStats: (novelId: number) => `novel_stats_${novelId}`,
  novelDetails: (novelId: number) => `novel_details_${novelId}`,

  // Discovery data
  discoveryData: () => 'discovery_data',
  trendingNovels: () => 'trending_novels',
  newArrivals: () => 'new_arrivals',
  editorsChoice: () => 'editors_choice',
  fantasyNovels: () => 'fantasy_novels',

  // Story tower data
  storyTower: (novelId: number) => `story_tower_${novelId}`,
  libraryCollections: (novelId: number, page?: number) =>
    `library_collections_${novelId}${page ? `_page_${page}` : ''}`,

  // Search and filters
  searchResults: (query: string, filters?: string) =>
    `search_${query}${filters ? `_${filters}` : ''}`,
} as const;