// Cache management utility to prevent unnecessary API calls
class CacheManager {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new CacheManager();

// React hook for cached API calls
import { useState, useEffect, useCallback } from "react";

export function useCachedApi<T>(
  key: string,
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  ttl?: number
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedData = apiCache.get(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }

      // Make API call
      const result = await apiCall();

      // Cache the result
      apiCache.set(key, result, ttl);
      setData(result);

      return result;
    } catch (err: any) {
      setError(err.message || "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, apiCall, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const invalidate = useCallback(() => {
    apiCache.invalidate(key);
  }, [key]);

  const refetch = useCallback(() => {
    apiCache.invalidate(key);
    return fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch, invalidate };
}
