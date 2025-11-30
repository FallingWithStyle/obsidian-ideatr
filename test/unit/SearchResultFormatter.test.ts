import { describe, it, expect } from 'vitest';
import type { SearchResult } from '../../src/types/search';
import { formatSearchResultsForFrontmatter } from '../../src/services/SearchResultFormatter';

describe('SearchResultFormatter', () => {
    describe('formatSearchResultsForFrontmatter', () => {
        it('should format search result with all fields', () => {
            const results: SearchResult[] = [
                {
                    title: 'TaskMaster app',
                    url: 'https://example.com/taskmaster',
                    snippet: 'A task management application',
                    date: '2025-11-15',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results);
            expect(formatted).toEqual([
                'Found similar product: TaskMaster app | URL: https://example.com/taskmaster | Date: 2025-11-15'
            ]);
        });

        it('should format result without date', () => {
            const results: SearchResult[] = [
                {
                    title: 'Test Product',
                    url: 'https://example.com/test',
                    snippet: 'Test snippet',
                    relevance: 0.8
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results);
            expect(formatted[0]).toContain('Found similar product: Test Product');
            expect(formatted[0]).toContain('URL: https://example.com/test');
            expect(formatted[0]).not.toContain('Date:');
        });

        it('should format multiple results', () => {
            const results: SearchResult[] = [
                {
                    title: 'Product 1',
                    url: 'https://example.com/1',
                    snippet: 'Snippet 1',
                    date: '2025-11-15',
                    relevance: 0.9
                },
                {
                    title: 'Product 2',
                    url: 'https://example.com/2',
                    snippet: 'Snippet 2',
                    date: '2024-08-20',
                    relevance: 0.8
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results);
            expect(formatted).toHaveLength(2);
            expect(formatted[0]).toContain('Product 1');
            expect(formatted[1]).toContain('Product 2');
        });

        it('should limit results to maxResults', () => {
            const results: SearchResult[] = Array.from({ length: 10 }, (_, i) => ({
                title: `Product ${i + 1}`,
                url: `https://example.com/${i + 1}`,
                snippet: `Snippet ${i + 1}`,
                relevance: 0.9 - i * 0.1
            }));

            const formatted = formatSearchResultsForFrontmatter(results, 5);
            expect(formatted.length).toBeLessThanOrEqual(5);
        });

        it('should return empty array for empty input', () => {
            const formatted = formatSearchResultsForFrontmatter([]);
            expect(formatted).toEqual([]);
        });

        it('should handle result with very long title', () => {
            const results: SearchResult[] = [
                {
                    title: 'A'.repeat(200),
                    url: 'https://example.com',
                    snippet: 'Test',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results);
            expect(formatted[0].length).toBeLessThan(500); // Reasonable length
        });

        it('should use category-aware text for game category', () => {
            const results: SearchResult[] = [
                {
                    title: 'Epic Adventure',
                    url: 'https://example.com/game',
                    snippet: 'A great game',
                    date: '2025-11-15',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results, undefined, 'game');
            expect(formatted[0]).toContain('Found similar game:');
            expect(formatted[0]).not.toContain('Found similar product:');
        });

        it('should use category-aware text for story category', () => {
            const results: SearchResult[] = [
                {
                    title: 'Mystery Novel',
                    url: 'https://example.com/story',
                    snippet: 'A great story',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results, undefined, 'story');
            expect(formatted[0]).toContain('Found similar story:');
        });

        it('should use category-aware text for app/saas category', () => {
            const results: SearchResult[] = [
                {
                    title: 'TaskMaster',
                    url: 'https://example.com/app',
                    snippet: 'A great app',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results, undefined, 'saas');
            expect(formatted[0]).toContain('Found similar app:');
        });

        it('should use generic text for unknown category', () => {
            const results: SearchResult[] = [
                {
                    title: 'Unknown Item',
                    url: 'https://example.com',
                    snippet: 'Test',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results, undefined, '');
            expect(formatted[0]).toContain('Found similar:');
        });

        it('should default to product when category not provided (backward compatibility)', () => {
            const results: SearchResult[] = [
                {
                    title: 'Test Product',
                    url: 'https://example.com',
                    snippet: 'Test',
                    relevance: 0.9
                }
            ];

            const formatted = formatSearchResultsForFrontmatter(results);
            expect(formatted[0]).toContain('Found similar product:');
        });
    });
});

