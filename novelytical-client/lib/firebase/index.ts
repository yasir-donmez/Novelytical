/**
 * Firebase optimization utilities
 */

export * from './query-optimizer';
export * from './query-optimizer-impl';
export * from './composite-index-optimizer';
export * from './discovery-optimizer';
export * from './performance-monitor';
export * from './optimization-integration';

export { getQueryOptimizer, resetQueryOptimizer } from './query-optimizer-impl';
export { getCompositeIndexOptimizer, resetCompositeIndexOptimizer } from './composite-index-optimizer';
export { getDiscoveryOptimizer, resetDiscoveryOptimizer } from './discovery-optimizer';
export { performanceMonitor } from './performance-monitor';
export { 
  getOptimizationIntegrationManager, 
  initializeOptimizationSystems,
  resetOptimizationIntegrationManager 
} from './optimization-integration';