#!/usr/bin/env ts-node

/**
 * Performance Validation Script
 * 
 * Bu script Firebase optimizasyon hedeflerini doğrular ve
 * detaylı performans raporu sağlar.
 * 
 * Kullanım:
 * npm run validate-performance
 * veya
 * npx ts-node scripts/validate-performance.ts
 */

import { runPerformanceValidation, startPerformanceMonitoring } from '../lib/firebase/performance-validation';
import { initializeOptimizationSystems } from '../lib/firebase/optimization-integration';

async function main() {
  try {
    console.log('🚀 Firebase Optimization Performance Validation');
    console.log('================================================\n');

    // Initialize optimization systems
    console.log('📋 Initializing optimization systems...');
    await initializeOptimizationSystems();
    console.log('✅ Optimization systems initialized\n');

    // Run performance validation
    console.log('🎯 Running performance validation...');
    const result = await runPerformanceValidation();

    // Exit with appropriate code
    if (result.overall.passed) {
      console.log('\n🎉 All performance targets achieved!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some performance targets not met. See recommendations above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Performance validation failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--monitor')) {
  console.log('📊 Starting continuous performance monitoring...');
  
  // Initialize and start monitoring
  initializeOptimizationSystems()
    .then(() => {
      const interval = startPerformanceMonitoring(5 * 60 * 1000); // 5 minutes
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping performance monitoring...');
        clearInterval(interval);
        process.exit(0);
      });
      
      console.log('✅ Performance monitoring started (Ctrl+C to stop)');
    })
    .catch(error => {
      console.error('❌ Failed to start monitoring:', error);
      process.exit(1);
    });
} else {
  // Run one-time validation
  main();
}