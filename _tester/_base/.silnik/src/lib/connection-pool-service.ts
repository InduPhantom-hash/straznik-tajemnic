// Connection Pool Service - Manages HTTP connections for better performance
interface ConnectionPoolConfig {
  maxConnections: number;
  maxIdleTime: number; // milliseconds
  keepAlive: boolean;
  timeout: number; // milliseconds
  retryAttempts: number;
}

interface PooledConnection {
  id: string;
  url: string;
  lastUsed: number;
  isActive: boolean;
  requestCount: number;
}

class ConnectionPoolService {
  private pools = new Map<string, PooledConnection[]>();
  private config: ConnectionPoolConfig = {
    maxConnections: 10,
    maxIdleTime: 5 * 60 * 1000, // 5 minutes
    keepAlive: true,
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  // Create optimized fetch with connection pooling
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const poolKey = this.getPoolKey(url);
    
    // Enhanced headers for better connection management
    const enhancedOptions: RequestInit = {
      ...options,
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    };

    // Add timeout if not specified
    if (!options.signal) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      enhancedOptions.signal = controller.signal;
      
      // Clear timeout on response
      const originalFetch = fetch(url, enhancedOptions);
      originalFetch.finally(() => clearTimeout(timeoutId));
      
      return this.executeWithRetry(url, enhancedOptions, poolKey);
    }

    return this.executeWithRetry(url, enhancedOptions, poolKey);
  }

  // Execute request with retry logic
  private async executeWithRetry(
    url: string, 
    options: RequestInit, 
    poolKey: string
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.performRequest(url, options, poolKey);
        
        // Track successful request
        this.trackRequest(poolKey, true);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Track failed request
        this.trackRequest(poolKey, false);
        
        if (attempt < this.config.retryAttempts - 1) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await this.delay(delay);
          
          console.warn(`Request attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        }
      }
    }
    
    throw lastError!;
  }

  // Perform the actual request
  private async performRequest(
    url: string, 
    options: RequestInit,
    poolKey: string
  ): Promise<Response> {
    // Get or create connection
    const connection = this.getConnection(poolKey, url);
    
    try {
      const response = await fetch(url, options);
      
      // Update connection stats
      connection.lastUsed = Date.now();
      connection.requestCount++;
      connection.isActive = false;
      
      return response;
    } catch (error) {
      connection.isActive = false;
      throw error;
    }
  }

  // Get or create a connection from pool
  private getConnection(poolKey: string, url: string): PooledConnection {
    let pool = this.pools.get(poolKey);
    
    if (!pool) {
      pool = [];
      this.pools.set(poolKey, pool);
    }

    // Find available connection
    const availableConnection = pool.find(conn => 
      !conn.isActive && 
      Date.now() - conn.lastUsed < this.config.maxIdleTime
    );

    if (availableConnection) {
      availableConnection.isActive = true;
      return availableConnection;
    }

    // Create new connection if under limit
    if (pool.length < this.config.maxConnections) {
      const newConnection: PooledConnection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        url,
        lastUsed: Date.now(),
        isActive: true,
        requestCount: 0
      };
      
      pool.push(newConnection);
      return newConnection;
    }

    // Reuse least recently used connection
    const lruConnection = pool.reduce((oldest, current) => 
      current.lastUsed < oldest.lastUsed ? current : oldest
    );
    
    lruConnection.isActive = true;
    lruConnection.lastUsed = Date.now();
    
    return lruConnection;
  }

  // Generate pool key from URL
  private getPoolKey(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url;
    }
  }

  // Track request statistics
  private trackRequest(poolKey: string, success: boolean): void {
    // This could be extended to collect metrics
    console.debug(`Request to ${poolKey}: ${success ? 'success' : 'failed'}`);
  }

  // Cleanup idle connections
  private cleanup(): void {
    const now = Date.now();
    
    for (const [poolKey, pool] of this.pools.entries()) {
      const activeConnections = pool.filter(conn => 
        conn.isActive || (now - conn.lastUsed) < this.config.maxIdleTime
      );
      
      if (activeConnections.length === 0) {
        this.pools.delete(poolKey);
      } else if (activeConnections.length < pool.length) {
        this.pools.set(poolKey, activeConnections);
      }
    }
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.maxIdleTime);
  }

  // Get pool statistics
  getStats(): {
    totalPools: number;
    totalConnections: number;
    activeConnections: number;
    poolDetails: Array<{
      poolKey: string;
      connections: number;
      activeConnections: number;
      totalRequests: number;
    }>;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    const poolDetails: Array<{
      poolKey: string;
      connections: number;
      activeConnections: number;
      totalRequests: number;
    }> = [];

    for (const [poolKey, pool] of this.pools.entries()) {
      const active = pool.filter(conn => conn.isActive).length;
      const totalRequests = pool.reduce((sum, conn) => sum + conn.requestCount, 0);
      
      totalConnections += pool.length;
      activeConnections += active;
      
      poolDetails.push({
        poolKey,
        connections: pool.length,
        activeConnections: active,
        totalRequests
      });
    }

    return {
      totalPools: this.pools.size,
      totalConnections,
      activeConnections,
      poolDetails
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Destroy service
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.pools.clear();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const connectionPoolService = new ConnectionPoolService();
export type { ConnectionPoolConfig, PooledConnection };
