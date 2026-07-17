/**
 * Error handling utilities for Zew Cthulhu RPG Application
 * Provides robust error handling, logging, and recovery mechanisms
 */

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  userAgent?: string;
  additionalData?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly context: ErrorContext;
  public readonly isRecoverable: boolean;
  public readonly errorCode: string;

  constructor(
    message: string,
    context: Omit<ErrorContext, 'timestamp'>,
    isRecoverable: boolean = true,
    errorCode: string = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    this.context = {
      ...context,
      timestamp: new Date(),
    };
    this.isRecoverable = isRecoverable;
    this.errorCode = errorCode;
  }
}

/**
 * Global error handler for unhandled errors
 */
export function handleGlobalError(
  error: Error,
  context?: Partial<ErrorContext>
) {
  const errorContext: ErrorContext = {
    component: context?.component || 'Unknown',
    action: context?.action || 'Unknown',
    userId: context?.userId,
    sessionId: context?.sessionId,
    timestamp: new Date(),
    userAgent:
      typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    additionalData: context?.additionalData,
  };

  // Log error
  logError(error, errorContext);

  // Attempt recovery if possible
  if (error instanceof AppError && error.isRecoverable) {
    attemptRecovery(error);
  }

  // Show user-friendly error message
  showErrorToast(error);
}

/**
 * Log error with context
 */
export function logError(error: Error, context: ErrorContext) {
  const logEntry = {
    timestamp: context.timestamp.toISOString(),
    level: 'ERROR',
    component: context.component,
    action: context.action,
    message: error.message,
    stack: error.stack,
    userId: context.userId,
    sessionId: context.sessionId,
    userAgent: context.userAgent,
    additionalData: context.additionalData,
  };

  // Console logging for development
  console.error('🚨 Application Error:', logEntry);

  // Store error log locally for debugging
  storeErrorLog(logEntry);

  // In production, this would send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTrackingService(logEntry);
  }
}

interface ErrorLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: ErrorContext;
  stack?: string;
}

/**
 * Store error logs locally
 */
function storeErrorLog(logEntry: ErrorLogEntry) {
  if (typeof window === 'undefined') return;
  if (typeof localStorage === 'undefined') return;

  try {
    const existingLogs = localStorage.getItem('error_logs');
    const logs = existingLogs ? JSON.parse(existingLogs) : [];

    // Keep only last 50 errors
    logs.unshift(logEntry);
    if (logs.length > 50) {
      logs.splice(50);
    }

    localStorage.setItem('error_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to store error log:', e);
  }
}

/**
 * Attempt to recover from error
 */
function attemptRecovery(error: AppError) {
  switch (error.errorCode) {
    case 'STORAGE_QUOTA_EXCEEDED':
      clearOldData();
      break;

    case 'NETWORK_ERROR':
      // Retry network requests
      break;

    case 'DATA_CORRUPTION':
      restoreFromBackup();
      break;

    default:
      // Generic recovery - clear cache
      clearCache();
      break;
  }
}

/**
 * Clear old data to free up storage
 */
export function clearOldData() {
  if (typeof window === 'undefined') return;
  if (typeof localStorage === 'undefined') return;

  try {
    // Clear old localStorage items
    const keys = Object.keys(localStorage);
    const oldKeys = keys.filter((key) => {
      if (key.startsWith('temp_') || key.startsWith('cache_')) {
        return true;
      }

      // Check if item is older than 30 days
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.timestamp) {
            const itemDate = new Date(parsed.timestamp);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return itemDate < thirtyDaysAgo;
          }
        }
      } catch {
        // Not JSON or no timestamp, skip
      }

      return false;
    });

    oldKeys.forEach((key) => localStorage.removeItem(key));
    console.log(`🧹 Cleared ${oldKeys.length} old items from localStorage`);
  } catch {
    console.error('Failed to clear old data');
  }
}

/**
 * Restore data from backup
 */
function restoreFromBackup() {
  if (typeof window === 'undefined') return;
  if (typeof localStorage === 'undefined') return;

  try {
    // Try to restore from local backup
    const backup = localStorage.getItem('data_backup');
    if (backup) {
      const backupData = JSON.parse(backup);

      // Restore characters
      if (backupData.characters) {
        localStorage.setItem(
          'characters',
          JSON.stringify(backupData.characters)
        );
      }

      // Restore sessions
      if (backupData.sessions) {
        localStorage.setItem('sessions', JSON.stringify(backupData.sessions));
      }

      console.log('🔄 Data restored from backup');
    }
  } catch {
    console.error('Failed to restore from backup');
  }
}

/**
 * Clear application cache
 */
export function clearCache() {
  if (typeof window === 'undefined') return;

  try {
    // Clear cache items
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));

    cacheKeys.forEach((key) => localStorage.removeItem(key));
    console.log(`🧹 Cleared ${cacheKeys.length} cache items`);
  } catch {
    console.error('Failed to clear cache');
  }
}

/**
 * Create automatic data backup
 */
export function createDataBackup() {
  if (typeof window === 'undefined') return;
  if (typeof localStorage === 'undefined') return;

  try {
    const backup = {
      timestamp: new Date().toISOString(),
      characters: localStorage.getItem('characters'),
      sessions: localStorage.getItem('sessions'),
      musicUrl: localStorage.getItem('musicUrl'),
      diceHistory: localStorage.getItem('dice_roll_history'),
    };

    localStorage.setItem('data_backup', JSON.stringify(backup));
    console.log('💾 Data backup created');
  } catch {
    console.error('Failed to create data backup');
  }
}

/**
 * Show error toast to user
 */
function showErrorToast(error: Error) {
  // This would integrate with your toast system
  // For now, just console log
  console.warn('⚠️ User Error:', error.message);

  // In a real app, you'd show a toast notification
  // showToast({
  //   type: 'error',
  //   title: 'Wystąpił błąd',
  //   description: getUserFriendlyMessage(error)
  // });
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(
  error: Error
): string {
  if (error instanceof AppError) {
    switch (error.errorCode) {
      case 'STORAGE_QUOTA_EXCEEDED':
        return 'Brak miejsca w pamięci przeglądarki. Spróbuj wyczyścić stare dane.';
      case 'NETWORK_ERROR':
        return 'Problem z połączeniem internetowym. Sprawdź swoje połączenie.';
      case 'DATA_CORRUPTION':
        return 'Dane zostały uszkodzone. Przywracam z kopii zapasowej...';
      default:
        return 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.';
    }
  }

  return 'Wystąpił błąd aplikacji. Spróbuj ponownie.';
}

/**
 * Safe localStorage operations with error handling
 */
export class SafeStorage {
  static getItem(key: string): string | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      handleGlobalError(error as Error, {
        component: 'SafeStorage',
        action: 'getItem',
        additionalData: { key },
      });
      return null;
    }
  }

  static setItem(key: string, value: string): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      handleGlobalError(error as Error, {
        component: 'SafeStorage',
        action: 'setItem',
        additionalData: { key, valueLength: value.length },
      });
      return false;
    }
  }

  static removeItem(key: string): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      handleGlobalError(error as Error, {
        component: 'SafeStorage',
        action: 'removeItem',
        additionalData: { key },
      });
      return false;
    }
  }
}

/**
 * Initialize error handling
 */
export function initializeErrorHandling() {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return;
  }

  // Check if localStorage is available
  if (typeof localStorage === 'undefined') {
    console.warn(
      'localStorage not available, skipping error handling initialization'
    );
    return;
  }

  try {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      handleGlobalError(event.reason, {
        component: 'Global',
        action: 'unhandledRejection',
      });
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      handleGlobalError(event.error, {
        component: 'Global',
        action: 'uncaughtError',
      });
    });

    // Create initial data backup
    createDataBackup();

    // Set up periodic backup (every 5 minutes)
    setInterval(createDataBackup, 5 * 60 * 1000);
  } catch (error) {
    console.warn('Failed to initialize error handling:', error);
  }
}
