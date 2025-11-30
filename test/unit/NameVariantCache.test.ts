import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NameVariantCache } from '../../src/services/NameVariantCache';
import type { NameVariant } from '../../src/types/transformation';

describe('NameVariantCache', () => {
    let cache: NameVariantCache;

    beforeEach(() => {
        cache = new NameVariantCache(1000); // 1 second TTL for testing
    });

    describe('get and set', () => {
        it('should store and retrieve variants', () => {
            const variants: NameVariant[] = [
                { text: 'Variant1', type: 'synonym' },
                { text: 'Variant2', type: 'short' }
            ];

            cache.set('TaskMaster', variants);
            const result = cache.get('TaskMaster');

            expect(result).toEqual(variants);
        });

        it('should return null for non-existent key', () => {
            const result = cache.get('NonExistent');
            expect(result).toBeNull();
        });

        it('should normalize keys (case-insensitive)', () => {
            const variants: NameVariant[] = [{ text: 'Variant1', type: 'synonym' }];
            
            cache.set('TaskMaster', variants);
            const result1 = cache.get('taskmaster');
            const result2 = cache.get('TASKMASTER');

            expect(result1).toEqual(variants);
            expect(result2).toEqual(variants);
        });

        it('should handle expired entries', async () => {
            const variants: NameVariant[] = [{ text: 'Variant1', type: 'synonym' }];
            
            cache.set('TaskMaster', variants);
            
            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const result = cache.get('TaskMaster');
            expect(result).toBeNull();
        });
    });

    describe('clearExpired', () => {
        it('should remove expired entries', async () => {
            const variants: NameVariant[] = [{ text: 'Variant1', type: 'synonym' }];
            
            cache.set('Expired', variants);
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            cache.clearExpired();
            
            expect(cache.get('Expired')).toBeNull();
            expect(cache.size()).toBe(0);
        });

        it('should keep non-expired entries', () => {
            const variants: NameVariant[] = [{ text: 'Variant1', type: 'synonym' }];
            
            cache.set('Valid', variants);
            cache.clearExpired();
            
            expect(cache.get('Valid')).toEqual(variants);
        });
    });

    describe('clear', () => {
        it('should clear all entries', () => {
            const variants: NameVariant[] = [{ text: 'Variant1', type: 'synonym' }];
            
            cache.set('Key1', variants);
            cache.set('Key2', variants);
            
            expect(cache.size()).toBe(2);
            
            cache.clear();
            
            expect(cache.size()).toBe(0);
            expect(cache.get('Key1')).toBeNull();
            expect(cache.get('Key2')).toBeNull();
        });
    });

    describe('size', () => {
        it('should return correct cache size', () => {
            expect(cache.size()).toBe(0);
            
            cache.set('Key1', []);
            expect(cache.size()).toBe(1);
            
            cache.set('Key2', []);
            expect(cache.size()).toBe(2);
            
            cache.clear();
            expect(cache.size()).toBe(0);
        });
    });
});

