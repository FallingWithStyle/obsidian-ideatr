import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DomainService } from '../../src/services/DomainService';
import { ProspectrService } from '../../src/services/ProspectrService';
import type { IProspectrService, DomainCheckResult } from '../../src/types/domain';

describe('DomainService', () => {
    let service: DomainService;
    let mockProspectrService: IProspectrService;

    beforeEach(() => {
        mockProspectrService = new ProspectrService();
        service = new DomainService(mockProspectrService);
    });

    describe('extractDomains', () => {
        it('should extract domain from text', () => {
            const text = 'I want to create example.com';
            const domains = service.extractDomains(text);

            expect(domains).toContain('example.com');
        });

        it('should extract multiple domains', () => {
            const text = 'Check out example.com and test.io';
            const domains = service.extractDomains(text);

            expect(domains).toContain('example.com');
            expect(domains).toContain('test.io');
        });

        it('should extract domains from quoted strings', () => {
            const text = 'The domain is "myapp.com"';
            const domains = service.extractDomains(text);

            expect(domains).toContain('myapp.com');
        });

        it('should extract domains after "domain:" label', () => {
            const text = 'domain: example.com';
            const domains = service.extractDomains(text);

            expect(domains).toContain('example.com');
        });

        it('should extract domains after "domains:" label', () => {
            const text = 'domains: test.io and example.com';
            const domains = service.extractDomains(text);

            expect(domains.length).toBeGreaterThan(0);
        });

        it('should deduplicate domains', () => {
            const text = 'example.com and example.com again';
            const domains = service.extractDomains(text);

            expect(domains.filter(d => d === 'example.com')).toHaveLength(1);
        });

        it('should return empty array when no domains found', () => {
            const text = 'This is just regular text with no domains';
            const domains = service.extractDomains(text);

            expect(domains).toEqual([]);
        });

        it('should handle case-insensitive domains', () => {
            const text = 'EXAMPLE.COM and Test.IO';
            const domains = service.extractDomains(text);

            expect(domains).toContain('example.com');
            expect(domains).toContain('test.io');
        });

        it('should handle various TLDs', () => {
            const text = 'example.com test.io myapp.net domain.org';
            const domains = service.extractDomains(text);

            expect(domains.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe('checkDomains', () => {
        it('should return empty array when no domains found', async () => {
            const text = 'No domains here';
            const results = await service.checkDomains(text);

            expect(results).toEqual([]);
        });

        it('should check extracted domains using ProspectrService', async () => {
            const text = 'Check example.com';
            const results = await service.checkDomains(text);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].domain).toBe('example.com');
        });

        it('should handle multiple domains', async () => {
            const text = 'Check example.com and test.io';
            const results = await service.checkDomains(text);

            expect(results.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle Prospectr service errors gracefully', async () => {
            // Create a mock service that throws an error
            const errorService: IProspectrService = {
                isAvailable: () => true,
                checkDomainAvailability: vi.fn().mockRejectedValue(new Error('API error')),
                checkDomainsAvailability: vi.fn().mockRejectedValue(new Error('API error'))
            };

            const errorServiceInstance = new DomainService(errorService);
            const text = 'Check example.com';
            const results = await errorServiceInstance.checkDomains(text);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].error).toBeDefined();
        });

        it('should return error when Prospectr is not available', async () => {
            const text = 'Check example.com';
            const results = await service.checkDomains(text);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].available).toBe(false);
            expect(results[0].error).toContain('Prospectr');
        });

        it('should include checkedAt timestamp in results', async () => {
            const text = 'Check example.com';
            const results = await service.checkDomains(text);

            expect(results[0].checkedAt).toBeDefined();
            expect(results[0].checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should return empty array when no domains in text even with project name', async () => {
            const text = 'MyAwesomeApp - A task management tool';
            const projectName = 'MyAwesomeApp';
            const results = await service.checkDomains(text, projectName);

            // Should return empty since no domains are explicitly mentioned
            expect(results).toEqual([]);
        });
    });
});

