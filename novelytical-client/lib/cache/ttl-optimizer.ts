/**
 * TTL Configuration Optimizer
 * 
 * Optimizes cache TTL values based on access patterns, data type characteristics,
 * and usage frequency to maximize cache efficiency and minimize Firebase reads.
 */

export interface TTLOptimizationConfig {
  // Minimum and maximum TTL bounds
  minTTL: number; // 5 minutes
  maxTTL: number; // 2 hours
  
  // Data type base TTLs
  baseTTLs: {
    static: number;
    dynamic: number;
    user: number;
    discovery: number;
    stats: number;
  };
  
  // Optimization parameters
  accessFrequencyWeight: number; // How much access frequency affects TTL
  recencyWeight: number; // How much recent access affects TTL
  volatilityWeight: number; // How much data volatility affects TTL
  
  // Analysis window
  analysisWindowMs: number; // Time window for access pattern analysis
  minAccessesForOptimization: number; // Minimum accesses needed for optimization
}

export interface AccessPattern {
  key: string;
  dataType: string;
  accesses: number[];
  totalAccesses: number;
  averageTimeBetweenAccesses: number;
  lastAccessed: number;
  volatilityScore: number; // 0-1, higher means more volatile
}

export interface TTLOptimizationResult {
  key: string;
  originalTTL: number;
  optimizedTTL: number;
  improvementRatio: number;
  confidence: number; // 0-1, confidence in the optimization
  reasoning: string[];
}

export const DEFAULT_TTL_CONFIG: TTLOptimizationConfig = {
  minTTL: 5 * 60 * 1000, // 5 minutes
  maxTTL: 2 * 60 * 60 * 1000, // 2 hours
  
  baseTTLs: {
    static: 60 * 60 * 1000, // 1 hour
    dynamic: 10 * 60 * 1000, // 10 minutes
    user: 30 * 60 * 1000, // 30 minutes
    discovery: 60 * 60 * 1000, // 1 hour
    stats: 60 * 60 * 1000 // 1 hour
  },
  
  accessFrequencyWeight: 0.4,
  recencyWeight: 0.3,
  volatilityWeight: 0.3,
  
  analysisWindowMs: 60 * 60 * 1000, // 1 hour
  minAccessesForOptimization: 3
};

export class TTLOptimizer {
  private accessPatterns = new Map<string, AccessPattern>();
  private optimizedTTLs = new Map<string, number>();
  private optimizationHistory = new Map<string, TTLOptimizationResult[]>();

  constructor(private config: TTLOptimizationConfig = DEFAULT_TTL_CONFIG) {}

  /**
   * Record an access to a cache key
   */
  recordAccess(key: string, dataType: string, volatilityHint?: number): void {
    const now = Date.now();
    
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, {
        key,
        dataType,
        accesses: [],
        totalAccesses: 0,
        averageTimeBetweenAccesses: 0,
        lastAccessed: now,
        volatilityScore: volatilityHint || this.inferVolatility(key, dataType)
      });
    }

    const pattern = this.accessPatterns.get(key)!;
    pattern.accesses.push(now);
    pattern.totalAccesses++;
    pattern.lastAccessed = now;

    // Keep only accesses within the analysis window
    const cutoff = now - this.config.analysisWindowMs;
    pattern.accesses = pattern.accesses.filter(timestamp => timestamp > cutoff);

    // Recalculate average time between accesses
    if (pattern.accesses.length > 1) {
      let totalTimeBetween = 0;
      for (let i = 1; i < pattern.accesses.length; i++) {
        totalTimeBetween += pattern.accesses[i] - pattern.accesses[i - 1];
      }
      pattern.averageTimeBetweenAccesses = totalTimeBetween / (pattern.accesses.length - 1);
    }
  }

  /**
   * Optimize TTL for a specific key based on its access pattern
   */
  optimizeTTL(key: string, dataType: string): number {
    // Return cached optimization if available
    if (this.optimizedTTLs.has(key)) {
      return this.optimizedTTLs.get(key)!;
    }

    const pattern = this.accessPatterns.get(key);
    const baseTTL = this.config.baseTTLs[dataType as keyof typeof this.config.baseTTLs] 
      || this.config.baseTTLs.dynamic;

    // If insufficient data, return base TTL
    if (!pattern || pattern.accesses.length < this.config.minAccessesForOptimization) {
      this.optimizedTTLs.set(key, baseTTL);
      return baseTTL;
    }

    const optimizationResult = this.calculateOptimalTTL(pattern, baseTTL);
    this.optimizedTTLs.set(key, optimizationResult.optimizedTTL);
    
    // Store optimization history
    if (!this.optimizationHistory.has(key)) {
      this.optimizationHistory.set(key, []);
    }
    this.optimizationHistory.get(key)!.push(optimizationResult);

    return optimizationResult.optimizedTTL;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalOptimized: number;
    avgTTL: number;
    optimizedKeys: string[];
    improvementRatio: number;
    confidenceScore: number;
  } {
    const optimizedKeys = Array.from(this.optimizedTTLs.keys());
    const totalOptimized = optimizedKeys.length;
    
    if (totalOptimized === 0) {
      return {
        totalOptimized: 0,
        avgTTL: 0,
        optimizedKeys: [],
        improvementRatio: 0,
        confidenceScore: 0
      };
    }

    const avgTTL = Array.from(this.optimizedTTLs.values())
      .reduce((sum, ttl) => sum + ttl, 0) / totalOptimized;

    // Calculate overall improvement ratio
    let totalImprovement = 0;
    let totalConfidence = 0;
    let validOptimizations = 0;

    for (const key of optimizedKeys) {
      const history = this.optimizationHistory.get(key);
      if (history && history.length > 0) {
        const latest = history[history.length - 1];
        totalImprovement += latest.improvementRatio;
        totalConfidence += latest.confidence;
        validOptimizations++;
      }
    }

    return {
      totalOptimized,
      avgTTL,
      optimizedKeys,
      improvementRatio: validOptimizations > 0 ? totalImprovement / validOptimizations : 0,
      confidenceScore: validOptimizations > 0 ? totalConfidence / validOptimizations : 0
    };
  }

  /**
   * Get TTL configuration for a specific key
   */
  getTTLConfig(key: string): number | undefined {
    return this.optimizedTTLs.get(key);
  }

  /**
   * Get optimization history for a key
   */
  getOptimizationHistory(key: string): TTLOptimizationResult[] {
    return this.optimizationHistory.get(key) || [];
  }

  /**
   * Reset optimizer state (useful for testing)
   */
  reset(): void {
    this.accessPatterns.clear();
    this.optimizedTTLs.clear();
    this.optimizationHistory.clear();
  }

  /**
   * Get access pattern for a key
   */
  getAccessPattern(key: string): AccessPattern | undefined {
    return this.accessPatterns.get(key);
  }

  // Private methods

  private calculateOptimalTTL(pattern: AccessPattern, baseTTL: number): TTLOptimizationResult {
    const reasoning: string[] = [];
    let optimizedTTL = baseTTL;
    let confidence = 0.5; // Base confidence

    // Factor 1: Access frequency
    const accessFrequency = pattern.accesses.length / (this.config.analysisWindowMs / (60 * 1000)); // accesses per minute
    
    if (accessFrequency > 1) { // More than 1 access per minute
      // High frequency → longer TTL to reduce cache misses
      const frequencyMultiplier = 1 + (accessFrequency * this.config.accessFrequencyWeight);
      optimizedTTL *= frequencyMultiplier;
      reasoning.push(`High access frequency (${accessFrequency.toFixed(2)}/min) → increased TTL`);
      confidence += 0.2;
    } else if (accessFrequency < 0.1) { // Less than 1 access per 10 minutes
      // Low frequency → shorter TTL to save memory
      const frequencyMultiplier = 0.5 + (accessFrequency * this.config.accessFrequencyWeight);
      optimizedTTL *= frequencyMultiplier;
      reasoning.push(`Low access frequency (${accessFrequency.toFixed(2)}/min) → decreased TTL`);
      confidence += 0.1;
    }

    // Factor 2: Time between accesses
    if (pattern.averageTimeBetweenAccesses > 0) {
      // Set TTL to 2x average access interval (but within bounds)
      const intervalBasedTTL = pattern.averageTimeBetweenAccesses * 2;
      const intervalWeight = this.config.recencyWeight;
      
      optimizedTTL = (optimizedTTL * (1 - intervalWeight)) + (intervalBasedTTL * intervalWeight);
      reasoning.push(`Average access interval: ${(pattern.averageTimeBetweenAccesses / 1000 / 60).toFixed(1)}min → adjusted TTL`);
      confidence += 0.2;
    }

    // Factor 3: Data volatility
    const volatilityMultiplier = 1 - (pattern.volatilityScore * this.config.volatilityWeight);
    optimizedTTL *= volatilityMultiplier;
    
    if (pattern.volatilityScore > 0.7) {
      reasoning.push('High volatility data → decreased TTL');
    } else if (pattern.volatilityScore < 0.3) {
      reasoning.push('Low volatility data → maintained/increased TTL');
    }

    // Apply bounds
    optimizedTTL = Math.max(this.config.minTTL, Math.min(this.config.maxTTL, optimizedTTL));

    // Calculate improvement ratio
    const improvementRatio = optimizedTTL / baseTTL;

    // Adjust confidence based on data quality
    if (pattern.accesses.length >= 10) confidence += 0.1;
    if (pattern.accesses.length >= 20) confidence += 0.1;
    
    confidence = Math.min(1, confidence);

    return {
      key: pattern.key,
      originalTTL: baseTTL,
      optimizedTTL: Math.round(optimizedTTL),
      improvementRatio,
      confidence,
      reasoning
    };
  }

  private inferVolatility(key: string, dataType: string): number {
    // Infer data volatility based on key patterns and data type
    if (dataType === 'static') return 0.1; // Very stable
    if (dataType === 'discovery') return 0.3; // Moderately stable
    if (dataType === 'user') return 0.4; // User data changes occasionally
    if (dataType === 'stats') return 0.6; // Stats change frequently
    if (dataType === 'dynamic') return 0.8; // Very volatile
    
    // Key-based inference
    if (key.includes('trending')) return 0.7;
    if (key.includes('search')) return 0.9;
    if (key.includes('profile')) return 0.3;
    if (key.includes('settings')) return 0.2;
    
    return 0.5; // Default moderate volatility
  }
}

// Singleton instance
let ttlOptimizerInstance: TTLOptimizer | null = null;

/**
 * Get the global TTL optimizer instance
 */
export function getTTLOptimizer(config?: TTLOptimizationConfig): TTLOptimizer {
  if (!ttlOptimizerInstance) {
    ttlOptimizerInstance = new TTLOptimizer(config);
  }
  return ttlOptimizerInstance;
}

/**
 * Reset the TTL optimizer instance (useful for testing)
 */
export function resetTTLOptimizer(): void {
  ttlOptimizerInstance = null;
}