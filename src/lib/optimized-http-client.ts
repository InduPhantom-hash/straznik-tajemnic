// Optimized HTTP Client - Enhanced fetch with connection pooling and caching
import { connectionPoolService } from './connection-pool-service';
import { apiCacheService } from './api-cache-service';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  priority?: 'high' | 'normal' | 'low';
}

interface RequestMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  fromCache: boolean;
  retryCount: number;
  error?: string;
}

class OptimizedHTTPClient {
  private requestMetrics = new Map<string, RequestMetrics>();

  // Main request method with all optimizations
  async request<T = any>(
    url: string, 
    config: RequestConfig = {}
  ): Promise<{
    data: T;
    metrics: RequestMetrics;
  }> {
    const startTime = Date.now();
    const requestId = `${config.method || 'GET'}-${url}-${startTime}`;
    
    const metrics: RequestMetrics = {
      startTime,
      endTime: 0,
      duration: 0,
      fromCache: false,
      retryCount: 0
    };

    try {
      // Check cache first if enabled
      if (config.cache !== false) {
        const cacheKey = this.generateCacheKey(url, config);
        const cached = apiCacheService.get('http', cacheKey);
        
        if (cached) {
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.fromCache = true;
          
          console.log(`Cache hit for ${url} (${metrics.duration}ms)`);
          
          return {
            data: cached as T,
            metrics
          };
        }
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...config.headers
        }
      };

      // Add body for non-GET requests
      if (config.body && requestOptions.method !== 'GET') {
        requestOptions.body = typeof config.body === 'string' 
          ? config.body 
          : JSON.stringify(config.body);
      }

      // Execute request with connection pooling
      const response = await connectionPoolService.fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const data = await this.parseResponse<T>(response);

      // Cache response if enabled
      if (config.cache !== false) {
        const cacheKey = this.generateCacheKey(url, config);
        const ttl = config.cacheTTL || 5 * 60 * 1000; // 5 minutes default
        apiCacheService.set('http', cacheKey, data, ttl);
      }

      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      console.log(`Request to ${url} completed (${metrics.duration}ms)`);

      return {
        data,
        metrics
      };

    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`Request to ${url} failed (${metrics.duration}ms):`, error);

      throw error;
    } finally {
      this.requestMetrics.set(requestId, metrics);
    }
  }

  // Convenience methods
  async get<T = any>(url: string, config: Omit<RequestConfig, 'method'> = {}) {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T = any>(url: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(url, { ...config, method: 'POST', body });
  }

  async put<T = any>(url: string, body?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(url, { ...config, method: 'PUT', body });
  }

  async delete<T = any>(url: string, config: Omit<RequestConfig, 'method'> = {}) {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  // Batch requests with parallel execution
  async batch<T extends Record<string, any>>(
    requests: Array<{
      key: keyof T;
      url: string;
      config?: RequestConfig;
    }>
  ): Promise<T> {
    const results = {} as T;
    
    // Execute all requests in parallel
    const promises = requests.map(async (req) => {
      try {
        const result = await this.request(req.url, req.config);
        results[req.key] = result.data;
      } catch (error) {
        console.error(`Batch request ${String(req.key)} failed:`, error);
        results[req.key] = null as any;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Generate cache key
  private generateCacheKey(url: string, config: RequestConfig): Record<string, any> {
    return {
      url,
      method: config.method || 'GET',
      body: config.body,
      headers: config.headers
    };
  }

  // Parse response based on content type
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    } else if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    } else if (contentType.includes('application/octet-stream') || contentType.includes('audio/')) {
      return response.arrayBuffer() as unknown as T;
    } else {
      // Try JSON first, fallback to text
      try {
        return response.json();
      } catch {
        return response.text() as unknown as T;
      }
    }
  }

  // Get request metrics
  getMetrics(): Array<{
    requestId: string;
    metrics: RequestMetrics;
  }> {
    return Array.from(this.requestMetrics.entries()).map(([requestId, metrics]) => ({
      requestId,
      metrics
    }));
  }

  // Get performance summary
  getPerformanceSummary(): {
    totalRequests: number;
    cacheHitRate: number;
    averageResponseTime: number;
    totalErrors: number;
  } {
    const metrics = Array.from(this.requestMetrics.values());
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        totalErrors: 0
      };
    }

    const cacheHits = metrics.filter(m => m.fromCache).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const errors = metrics.filter(m => m.error).length;

    return {
      totalRequests: metrics.length,
      cacheHitRate: cacheHits / metrics.length,
      averageResponseTime: totalDuration / metrics.length,
      totalErrors: errors
    };
  }

  // Clear metrics
  clearMetrics(): void {
    this.requestMetrics.clear();
  }
}

// Export singleton instance
export const httpClient = new OptimizedHTTPClient();
export type { RequestConfig, RequestMetrics };
