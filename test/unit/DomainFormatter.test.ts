import { describe, it, expect } from 'vitest';
import type { DomainCheckResult } from '../../src/types/domain';
import { formatDomainResultsForFrontmatter } from '../../src/services/DomainFormatter';

describe('DomainFormatter', () => {
    describe('formatDomainResultsForFrontmatter', () => {
        it('should format available domain correctly', () => {
            const results: DomainCheckResult[] = [
                {
                    domain: 'example.com',
                    available: true,
                    checkedAt: '2025-11-28T10:30:00Z'
                }
            ];

            const formatted = formatDomainResultsForFrontmatter(results);
            expect(formatted).toEqual(['example.com (available)']);
        });

        it('should format taken domain correctly', () => {
            const results: DomainCheckResult[] = [
                {
                    domain: 'test.io',
                    available: false,
                    checkedAt: '2025-11-28T10:30:00Z'
                }
            ];

            const formatted = formatDomainResultsForFrontmatter(results);
            expect(formatted).toEqual(['test.io (taken)']);
        });

        it('should format domain with error correctly', () => {
            const results: DomainCheckResult[] = [
                {
                    domain: 'example.com',
                    available: false,
                    error: 'Prospectr service is not yet available',
                    checkedAt: '2025-11-28T10:30:00Z'
                }
            ];

            const formatted = formatDomainResultsForFrontmatter(results);
            expect(formatted).toEqual(['example.com (error: Prospectr service is not yet available)']);
        });

        it('should format multiple domains correctly', () => {
            const results: DomainCheckResult[] = [
                {
                    domain: 'example.com',
                    available: true,
                    checkedAt: '2025-11-28T10:30:00Z'
                },
                {
                    domain: 'test.io',
                    available: false,
                    checkedAt: '2025-11-28T10:30:00Z'
                },
                {
                    domain: 'myapp.net',
                    available: false,
                    error: 'Timeout: Request exceeded 10s',
                    checkedAt: '2025-11-28T10:30:00Z'
                }
            ];

            const formatted = formatDomainResultsForFrontmatter(results);
            expect(formatted).toEqual([
                'example.com (available)',
                'test.io (taken)',
                'myapp.net (error: Timeout: Request exceeded 10s)'
            ]);
        });

        it('should return empty array for empty input', () => {
            const formatted = formatDomainResultsForFrontmatter([]);
            expect(formatted).toEqual([]);
        });

        it('should handle domain with timeout error', () => {
            const results: DomainCheckResult[] = [
                {
                    domain: 'example.com',
                    available: false,
                    error: 'Timeout: Request exceeded 10s',
                    checkedAt: '2025-11-28T10:30:00Z'
                }
            ];

            const formatted = formatDomainResultsForFrontmatter(results);
            expect(formatted).toEqual(['example.com (error: Timeout: Request exceeded 10s)']);
        });

        it('should handle domain with network error', () => {
            const results: DomainCheckResult[] = [
                {
                    domain: 'example.com',
                    available: false,
                    error: 'Network error: Connection refused',
                    checkedAt: '2025-11-28T10:30:00Z'
                }
            ];

            const formatted = formatDomainResultsForFrontmatter(results);
            expect(formatted).toEqual(['example.com (error: Network error: Connection refused)']);
        });
    });
});

