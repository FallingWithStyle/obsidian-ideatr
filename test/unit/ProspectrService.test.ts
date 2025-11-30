import { describe, it, expect, beforeEach } from 'vitest';
import { ProspectrService } from '../../src/services/ProspectrService';

describe('ProspectrService', () => {
    let service: ProspectrService;

    beforeEach(() => {
        service = new ProspectrService();
    });

    describe('isAvailable', () => {
        it('should return false when Prospectr is not yet implemented', () => {
            expect(service.isAvailable()).toBe(false);
        });
    });

    describe('checkDomainAvailability', () => {
        it('should return stubbed result when service is not available', async () => {
            const result = await service.checkDomainAvailability('example.com');

            expect(result.domain).toBe('example.com');
            expect(result.available).toBe(false);
            expect(result.error).toContain('Prospectr');
            expect(result.checkedAt).toBeDefined();
        });

        it('should include ISO timestamp in result', async () => {
            const result = await service.checkDomainAvailability('test.io');

            expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should handle various domain formats', async () => {
            const domains = ['example.com', 'test.io', 'my-app.net', 'subdomain.example.org'];

            for (const domain of domains) {
                const result = await service.checkDomainAvailability(domain);
                expect(result.domain).toBe(domain);
                expect(result.available).toBe(false);
            }
        });
    });

    describe('checkDomainsAvailability', () => {
        it('should check multiple domains', async () => {
            const domains = ['example.com', 'test.io', 'myapp.net'];
            const results = await service.checkDomainsAvailability(domains);

            expect(results).toHaveLength(3);
            expect(results.map(r => r.domain)).toEqual(domains);
        });

        it('should return empty array for empty input', async () => {
            const results = await service.checkDomainsAvailability([]);
            expect(results).toEqual([]);
        });

        it('should handle single domain', async () => {
            const results = await service.checkDomainsAvailability(['example.com']);
            expect(results).toHaveLength(1);
            expect(results[0].domain).toBe('example.com');
        });
    });
});

