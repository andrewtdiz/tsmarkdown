import * as crypto from 'crypto';

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

/**
 * High-performance in-memory cache with TTL and LRU eviction
 */
export class MDXCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private stats = { hits: 0, misses: 0 };
  private accessCounter = 0;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private options: CacheOptions = {}) {
    const {
      maxSize = 1000,
      cleanupInterval = 60000 // 1 minute
    } = options;

    this.options = { maxSize, cleanupInterval, ...options };

    if (cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (entry.ttl && Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access tracking
    entry.hits++;
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      hits: 0
    };

    // If cache is at max size, evict LRU entry
    if (this.cache.size >= (this.options.maxSize || 1000) && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (entry.ttl && Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = { hits: 0, misses: 0 };
    this.accessCounter = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    // Estimate memory usage
    let memoryUsage = 0;
    for (const [key, entry] of this.cache) {
      memoryUsage += key.length * 2; // UTF-16
      memoryUsage += JSON.stringify(entry.value).length * 2;
      memoryUsage += 64; // Overhead estimation
    }

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      memoryUsage
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries for inspection
   */
  entries(): Array<[string, CacheEntry<T>]> {
    return Array.from(this.cache.entries());
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (entry.ttl && now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

/**
 * Create content hash for cache keys
 */
export function createCacheKey(...parts: (string | object)[]): string {
  const content = parts.map(part =>
    typeof part === 'string' ? part : JSON.stringify(part)
  ).join('|');

  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Specialized cache for MDX compilation results
 */
export class MDXCompilationCache extends MDXCache {
  /**
   * Get compiled MDX result
   */
  getCompiled(source: string, context?: Record<string, any>): any {
    const key = createCacheKey('compile', source, context || {});
    return this.get(key);
  }

  /**
   * Set compiled MDX result
   */
  setCompiled(source: string, compiled: any, context?: Record<string, any>, ttl?: number): void {
    const key = createCacheKey('compile', source, context || {});
    this.set(key, compiled, ttl);
  }

  /**
   * Get rendered HTML result
   */
  getRendered(source: string, context?: Record<string, any>): string | undefined {
    const key = createCacheKey('render', source, context || {});
    return this.get(key);
  }

  /**
   * Set rendered HTML result
   */
  setRendered(source: string, html: string, context?: Record<string, any>, ttl?: number): void {
    const key = createCacheKey('render', source, context || {});
    this.set(key, html, ttl);
  }

  /**
   * Get execution result
   */
  getExecuted(source: string, context?: Record<string, any>): any {
    const key = createCacheKey('execute', source, context || {});
    return this.get(key);
  }

  /**
   * Set execution result
   */
  setExecuted(source: string, result: any, context?: Record<string, any>, ttl?: number): void {
    const key = createCacheKey('execute', source, context || {});
    this.set(key, result, ttl);
  }
}

/**
 * Global cache instances
 */
export const globalCompilationCache = new MDXCompilationCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 2 * 60 * 1000 // 2 minutes
});

export const globalRenderCache = new MDXCache({
  maxSize: 1000,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  cleanupInterval: 60 * 1000 // 1 minute
});

/**
 * Cache decorator for methods
 */
export function cached(cache: MDXCache, keyFn?: (...args: any[]) => string, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const key = keyFn ? keyFn(...args) : createCacheKey(propertyName, ...args);

      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = method.apply(this, args);

      // Handle async methods
      if (result instanceof Promise) {
        return result.then((value: any) => {
          cache.set(key, value, ttl);
          return value;
        });
      }

      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  constructor(private cache: MDXCompilationCache) { }

  /**
   * Warm cache with common MDX patterns
   */
  async warmCommonPatterns(): Promise<void> {
    const commonSources = [
      '# Hello World',
      '{{ name }}',
      '{condition && (content)}',
      '# {{ title }}\n{showContent && ({{ content }})}'
    ];

    const { parseMDX } = await import('./parser');
    const { compile: compileMDX } = await import('./compiler');

    for (const source of commonSources) {
      try {
        const parsed = parseMDX(source);
        const compiled = compileMDX(parsed);
        this.cache.setCompiled(source, compiled);
      } catch (error) {
        // Skip invalid patterns
      }
    }
  }

  /**
   * Warm cache from file system
   */
  async warmFromFiles(directory: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(directory)) return;

    const files = fs.readdirSync(directory).filter(f => f.endsWith('.mdx'));

    for (const file of files) {
      try {
        const source = fs.readFileSync(path.join(directory, file), 'utf-8');

        const { parseMDX } = await import('./parser');
        const { compile: compileMDX } = await import('./compiler');
        const parsed = parseMDX(source);
        const compiled = compileMDX(parsed);

        this.cache.setCompiled(source, compiled);
      } catch (error) {
        // Skip invalid files
      }
    }
  }
}