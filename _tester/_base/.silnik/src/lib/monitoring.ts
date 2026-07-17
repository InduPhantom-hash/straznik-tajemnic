/**
 * Monitoring utilities for Zew Cthulhu RPG Application
 * Tracks application health, performance, and creates automated backups
 */

import { SafeStorage, createDataBackup, clearOldData } from './error-handling';

export interface HealthMetrics {
  timestamp: Date;
  memoryUsage: number;
  storageUsage: number;
  sessionCount: number;
  characterCount: number;
  lastBackup: Date | null;
  errorCount: number;
  uptime: number;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  storageQuota: number;
  storageUsed: number;
}

/**
 * Monitor application health
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private startTime: Date;
  private metrics: HealthMetrics[] = [];
  private errorCount: number = 0;

  private constructor() {
    this.startTime = new Date();
    // Don't auto-initialize - let the calling code decide when to initialize
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  async initializeMonitoring() {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn(
        'localStorage not available, skipping monitoring initialization'
      );
      return;
    }

    try {
      // Record initial metrics
      await this.recordMetrics();

      // Set up periodic health checks
      setInterval(async () => {
        try {
          await this.recordMetrics();
          this.performHealthCheck();
        } catch (error) {
          console.warn('Error during periodic health check:', error);
        }
      }, 60000); // Every minute

      // Set up daily backup
      setInterval(
        () => {
          try {
            this.createScheduledBackup();
          } catch (error) {
            console.warn('Error during scheduled backup:', error);
          }
        },
        24 * 60 * 60 * 1000
      ); // Every 24 hours
    } catch (error) {
      console.warn('Failed to initialize monitoring:', error);
    }
  }

  private async recordMetrics() {
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        return;
      }

      const storageUsage = await this.getStorageUsage();
      const metrics: HealthMetrics = {
        timestamp: new Date(),
        memoryUsage: this.getMemoryUsage(),
        storageUsage,
        sessionCount: this.getSessionCount(),
        characterCount: this.getCharacterCount(),
        lastBackup: this.getLastBackupTime(),
        errorCount: this.errorCount,
        uptime: Date.now() - this.startTime.getTime(),
      };

      this.metrics.push(metrics);

      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics.shift();
      }

      // Store metrics locally
      SafeStorage.setItem('health_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to record metrics:', error);
    }
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const perfWithMemory = performance as typeof performance & {
        memory: { usedJSHeapSize: number };
      };
      return perfWithMemory.memory.usedJSHeapSize;
    }
    return 0;
  }

  private async getStorageUsage(): Promise<number> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      const navWithStorage = navigator as typeof navigator & {
        storage: {
          estimate: () => Promise<{ usage?: number }>;
        };
      };
      try {
        const estimate = await navWithStorage.storage.estimate();
        return estimate.usage || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  private getSessionCount(): number {
    try {
      if (typeof localStorage === 'undefined') {
        return 0;
      }
      const sessions = SafeStorage.getItem('sessions');
      if (sessions) {
        return JSON.parse(sessions).length;
      }
    } catch (e) {
      console.error('Failed to get session count:', e);
    }
    return 0;
  }

  private getCharacterCount(): number {
    try {
      if (typeof localStorage === 'undefined') {
        return 0;
      }
      const characters = SafeStorage.getItem('characters');
      if (characters) {
        return JSON.parse(characters).length;
      }
    } catch (e) {
      console.error('Failed to get character count:', e);
    }
    return 0;
  }

  private getLastBackupTime(): Date | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      const backup = SafeStorage.getItem('data_backup');
      if (backup) {
        const backupData = JSON.parse(backup);
        return new Date(backupData.timestamp);
      }
    } catch (e) {
      console.error('Failed to get last backup time:', e);
    }
    return null;
  }

  private performHealthCheck() {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return;

    const issues: string[] = [];

    // Check memory usage (warn if > 50MB)
    if (latestMetrics.memoryUsage > 50 * 1024 * 1024) {
      issues.push('High memory usage detected');
    }

    // Check error rate (warn if > 5 errors in last hour)
    const recentErrors = this.metrics
      .filter((m) => Date.now() - m.timestamp.getTime() < 60 * 60 * 1000)
      .reduce((sum, m) => sum + m.errorCount, 0);

    if (recentErrors > 5) {
      issues.push('High error rate detected');
    }

    // Check if backup is older than 24 hours
    if (latestMetrics.lastBackup) {
      const hoursSinceBackup =
        (Date.now() - latestMetrics.lastBackup.getTime()) / (1000 * 60 * 60);
      if (hoursSinceBackup > 24) {
        issues.push('Backup is outdated');
      }
    } else {
      issues.push('No backup found');
    }

    if (issues.length > 0) {
      console.warn('🚨 Health Check Issues:', issues);
      this.handleHealthIssues(issues);
    } else {
      console.log('✅ Health check passed');
    }
  }

  private handleHealthIssues(issues: string[]) {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      // Create emergency backup if critical
      if (
        issues.some(
          (issue) =>
            issue.includes('High error rate') || issue.includes('No backup')
        )
      ) {
        console.log('🚨 Creating emergency backup...');
        createDataBackup();
      }

      // Clear old data if storage is high
      if (issues.some((issue) => issue.includes('storage'))) {
        console.log('🧹 Clearing old data to free storage...');
        clearOldData();
      }
    } catch (error) {
      console.warn('Failed to handle health issues:', error);
    }
  }

  private createScheduledBackup() {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      console.log('📅 Creating scheduled backup...');
      createDataBackup();

      // Clean up old health metrics
      if (this.metrics.length > 50) {
        this.metrics.splice(0, this.metrics.length - 50);
        SafeStorage.setItem('health_metrics', JSON.stringify(this.metrics));
      }
    } catch (error) {
      console.warn('Failed to create scheduled backup:', error);
    }
  }

  /**
   * Record an error occurrence
   */
  recordError() {
    this.errorCount++;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get health history
   */
  getHealthHistory(hours: number = 24): HealthMetrics[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.metrics.filter((m) => m.timestamp.getTime() > cutoffTime);
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  static measurePageLoadTime(): number {
    if (typeof performance !== 'undefined' && performance.timing) {
      return (
        performance.timing.loadEventEnd - performance.timing.navigationStart
      );
    }
    return 0;
  }

  static async measureApiResponseTime(
    url: string,
    method: string = 'GET'
  ): Promise<number> {
    const startTime = Date.now();

    try {
      await fetch(url, { method });
      const endTime = Date.now();
      return endTime - startTime;
    } catch {
      console.error('API measurement failed');
      return -1;
    }
  }

  static getStorageInfo(): Promise<{ quota: number; used: number }> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      const navWithStorage = navigator as typeof navigator & {
        storage: {
          estimate: () => Promise<{ quota?: number; usage?: number }>;
        };
      };
      return navWithStorage.storage.estimate().then((estimate) => ({
        quota: estimate.quota || 0,
        used: estimate.usage || 0,
      }));
    }
    return Promise.resolve({ quota: 0, used: 0 });
  }

  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const storageInfo = await this.getStorageInfo();

    return {
      pageLoadTime: this.measurePageLoadTime(),
      apiResponseTime: 0, // Would be measured per API call
      memoryUsage:
        typeof performance !== 'undefined' && 'memory' in performance
          ? (
              performance as typeof performance & {
                memory: { usedJSHeapSize: number };
              }
            ).memory.usedJSHeapSize
          : 0,
      storageQuota: storageInfo.quota,
      storageUsed: storageInfo.used,
    };
  }
}

/**
 * Data integrity checker
 */
export class DataIntegrityChecker {
  static async checkDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check characters data
    try {
      const charactersData = SafeStorage.getItem('characters');
      if (charactersData) {
        const characters = JSON.parse(charactersData);
        if (!Array.isArray(characters)) {
          issues.push('Characters data is not an array');
        } else {
          characters.forEach((char, index) => {
            if (!char.id || !char.name) {
              issues.push(
                `Character at index ${index} is missing required fields`
              );
            }
          });
        }
      }
    } catch {
      issues.push('Characters data is corrupted');
    }

    // Check sessions data
    try {
      const sessionsData = SafeStorage.getItem('sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        if (!Array.isArray(sessions)) {
          issues.push('Sessions data is not an array');
        }
      }
    } catch {
      issues.push('Sessions data is corrupted');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  static async repairDataIntegrity(): Promise<boolean> {
    const { isValid, issues } = await this.checkDataIntegrity();

    if (isValid) {
      console.log('✅ Data integrity is good');
      return true;
    }

    console.log('🔧 Attempting to repair data integrity...');

    // Try to restore from backup
    try {
      const backup = SafeStorage.getItem('data_backup');
      if (backup) {
        const backupData = JSON.parse(backup);

        if (backupData.characters) {
          SafeStorage.setItem('characters', backupData.characters);
        }
        if (backupData.sessions) {
          SafeStorage.setItem('sessions', backupData.sessions);
        }

        console.log('✅ Data restored from backup');
        return true;
      }
    } catch (e) {
      console.error('Failed to restore from backup:', e);
    }

    // If backup fails, try to clean corrupted data
    try {
      SafeStorage.removeItem('characters');
      SafeStorage.removeItem('sessions');
      console.log('🧹 Corrupted data cleared');
      return true;
    } catch (e) {
      console.error('Failed to clear corrupted data:', e);
    }

    return false;
  }
}

/**
 * Initialize monitoring system
 */
export function initializeMonitoring() {
  if (typeof window !== 'undefined') {
    // Start health monitoring
    HealthMonitor.getInstance();

    // Perform initial data integrity check
    DataIntegrityChecker.checkDataIntegrity().then(({ isValid }) => {
      if (!isValid) {
        console.warn('🚨 Data integrity issues found');
        DataIntegrityChecker.repairDataIntegrity();
      }
    });

    // Set up periodic integrity checks
    setInterval(
      () => {
        DataIntegrityChecker.checkDataIntegrity();
      },
      30 * 60 * 1000
    ); // Every 30 minutes
  }
}

// Export singleton instance
export const healthMonitor = HealthMonitor.getInstance();
