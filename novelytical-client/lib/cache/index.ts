/**
 * Cache System Exports
 * 
 * Multi-layered caching system for Firebase optimization
 */

// Main interfaces and types
export type {
  CacheManager,
  CacheConfig,
  CacheLayer,
  CacheMetadata,
  CacheStats
} from './cache-manager';

// Default configuration and utilities
export {
  DEFAULT_CACHE_CONFIG,
  getTTLForDataType,
  CacheKeys
} from './cache-manager';

// Cache implementations
export { MemoryCache } from './memory-cache';
export { LocalStorageCache } from './localstorage-cache';
export { CacheManagerImpl, getCacheManager, resetCacheManager } from './cache-manager-impl';

// Advanced cache features
export { ResilientCacheManager } from './resilient-cache-manager';
export { getErrorRecoveryManager, resetErrorRecoveryManager } from './error-recovery-manager';
export { getBackgroundRefresher } from './background-cache-refresher';
export { getCacheMissHandler } from './cache-miss-handler';
export { getTTLOptimizer } from './ttl-optimizer';

// Convenience hooks and utilities for React components
export { useCachedData } from './react-cache-hooks';
export { withCache } from './cache-hoc';