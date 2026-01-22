'use client';

import { DiscoveryPageClient } from '@/components/discovery-page-client';

/**
 * Optimized Discovery Page
 * 
 * Firebase Optimization Features:
 * - Single unified API call instead of 4 separate calls
 * - Multi-layered caching (Memory → LocalStorage → Firebase)
 * - Optimized TTL values (60 minutes for discovery data)
 * - Composite index utilization for efficient queries
 * - Denormalized data structures for reduced reads
 * 
 * Performance Targets:
 * - Reduce Firebase reads from 151 to ~45 (70% reduction)
 * - Reduce rule evaluations from 15,000 to ~4,500 (70% reduction)
 * - Improve page load time through optimized caching
 */
export default function HomePage() {
    return <DiscoveryPageClient />;
}
