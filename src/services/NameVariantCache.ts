/**
 * Enhanced cache for name variants with persistence, size limits, and statistics
 * Caches variants by normalized idea name to avoid redundant LLM calls
 */

import type { NameVariant } from '../types/transformation';

interface CacheEntry {
    variants: NameVariant[];
    timestamp: number;
    quality?: number; // Optional quality score (0-1)
}

interface CacheStatistics {
    totalEntries: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    oldestEntry: number | null;
    newestEntry: number | null;
}

export class NameVariantCache {
    private cache: Map<string, CacheEntry>;
    private ttl: number; // Time to live in milliseconds (24 hours default)
    private maxSize: number; // Maximum number of entries (0 = unlimited)
    private statistics: {
        hits: number;
        misses: number;
    };

    constructor(ttl: number = 24 * 60 * 60 * 1000, maxSize: number = 0) {
        this.cache = new Map();
        this.ttl = ttl;
        this.maxSize = maxSize; // 0 means unlimited
        this.statistics = { hits: 0, misses: 0 };
    }

    /**
     * Get cached variants for an idea name
     */
    get(ideaName: string): NameVariant[] | null {
        const key = this.normalizeKey(ideaName);
        const entry = this.cache.get(key);

        if (!entry) {
            this.statistics.misses++;
            return null;
        }

        // Check if entry is expired
        const now = Date.now();
        if (now - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            this.statistics.misses++;
            return null;
        }

        this.statistics.hits++;
        return entry.variants;
    }

    /**
     * Store variants in cache with optional quality score
     */
    set(ideaName: string, variants: NameVariant[], quality?: number): void {
        const key = this.normalizeKey(ideaName);
        
        // Enforce size limit if set
        if (this.maxSize > 0 && this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Remove oldest entry (LRU-like, but simpler: remove first expired or oldest)
            this.evictOldest();
        }
        
        this.cache.set(key, {
            variants,
            timestamp: Date.now(),
            quality
        });
    }

    /**
     * Clear expired entries
     */
    clearExpired(): number {
        const now = Date.now();
        let cleared = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                cleared++;
            }
        }
        return cleared;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.statistics = { hits: 0, misses: 0 };
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    getStatistics(): CacheStatistics {
        const totalRequests = this.statistics.hits + this.statistics.misses;
        const hitRate = totalRequests > 0 ? this.statistics.hits / totalRequests : 0;
        
        let oldestEntry: number | null = null;
        let newestEntry: number | null = null;
        
        for (const entry of this.cache.values()) {
            if (oldestEntry === null || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
            }
            if (newestEntry === null || entry.timestamp > newestEntry) {
                newestEntry = entry.timestamp;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            totalHits: this.statistics.hits,
            totalMisses: this.statistics.misses,
            hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
            oldestEntry,
            newestEntry
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics(): void {
        this.statistics = { hits: 0, misses: 0 };
    }

    /**
     * Load cache from serialized data
     */
    loadFromData(data: Record<string, CacheEntry>): void {
        this.cache.clear();
        const now = Date.now();
        
        for (const [key, entry] of Object.entries(data)) {
            // Only load non-expired entries
            if (now - entry.timestamp <= this.ttl) {
                this.cache.set(key, entry);
            }
        }
    }

    /**
     * Serialize cache to data (for persistence)
     */
    toData(): Record<string, CacheEntry> {
        const data: Record<string, CacheEntry> = {};
        for (const [key, entry] of this.cache.entries()) {
            data[key] = entry;
        }
        return data;
    }

    /**
     * Evict oldest entry (used when cache is full)
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Normalize key for caching (lowercase, trimmed)
     */
    private normalizeKey(ideaName: string): string {
        return ideaName.toLowerCase().trim();
    }
}

