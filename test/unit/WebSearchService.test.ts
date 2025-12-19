import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSearchService } from '../../src/services/WebSearchService';
import type { IdeatrSettings } from '../../src/settings';

// Mock requestUrl from obsidian
vi.mock('obsidian', () => ({
    requestUrl: vi.fn()
}));

import { requestUrl } from 'obsidian';
const mockRequestUrl = vi.mocked(requestUrl);

describe('WebSearchService', () => {
    let service: WebSearchService;
    let mockSettings: IdeatrSettings;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        
        mockSettings = {
            llmProvider: 'llama',
            llamaServerUrl: 'http://localhost:8080',
            llamaBinaryPath: '',
            modelPath: '',
            llamaServerPort: 8080,
            concurrency: 1,
            llmTimeout: 10000,
            autoClassify: true,
            enableDomainCheck: true,
            autoCheckDomains: false,
            prospectrUrl: 'http://localhost:3000',
            domainCheckTimeout: 10000,
            enableWebSearch: true,
            autoSearchExistence: false,
            webSearchProvider: 'google',
            googleSearchApiKey: 'test-api-key',
            googleSearchEngineId: 'test-engine-id',
            webSearchTimeout: 15000,
            maxSearchResults: 5
        };

        service = new WebSearchService(mockSettings);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('isAvailable', () => {
        it('should return false when provider is none', () => {
            const settings = { ...mockSettings, webSearchProvider: 'none' };
            const svc = new WebSearchService(settings);
            expect(svc.isAvailable()).toBe(false);
        });

        it('should return false when API key is missing', () => {
            const settings = { ...mockSettings, googleSearchApiKey: '' };
            const svc = new WebSearchService(settings);
            expect(svc.isAvailable()).toBe(false);
        });

        it('should return false when engine ID is missing', () => {
            const settings = { ...mockSettings, googleSearchEngineId: '' };
            const svc = new WebSearchService(settings);
            expect(svc.isAvailable()).toBe(false);
        });

        it('should return true when properly configured', () => {
            expect(service.isAvailable()).toBe(true);
        });
    });

    describe('search', () => {
        it('should return empty array when service is not available', async () => {
            const settings = { ...mockSettings, webSearchProvider: 'none' };
            const svc = new WebSearchService(settings);
            
            const results = await svc.search('test query');
            expect(results).toEqual([]);
        });

        it('should make API call to Google Custom Search', async () => {
            const mockResponse = {
                items: [
                    {
                        title: 'Test Result',
                        link: 'https://example.com',
                        snippet: 'Test snippet',
                        pagemap: {
                            metatags: [{ 'article:published_time': '2025-11-28' }]
                        }
                    }
                ]
            };

            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: mockResponse,
                statusText: 'OK'
            });

            const results = await service.search('test query', undefined, 5);

            expect(mockRequestUrl).toHaveBeenCalled();
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].title).toBe('Test Result');
            expect(results[0].url).toBe('https://example.com');
        });

        it('should parse search results correctly', async () => {
            const mockResponse = {
                items: [
                    {
                        title: 'Test Result 1',
                        link: 'https://example.com/1',
                        snippet: 'Test snippet 1'
                    },
                    {
                        title: 'Test Result 2',
                        link: 'https://example.com/2',
                        snippet: 'Test snippet 2'
                    }
                ]
            };

            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: mockResponse,
                statusText: 'OK'
            });

            const results = await service.search('test', undefined, 5);

            expect(results).toHaveLength(2);
            expect(results[0].title).toBe('Test Result 1');
            expect(results[1].title).toBe('Test Result 2');
        });

        it('should limit results to maxResults', async () => {
            const mockResponse = {
                items: Array.from({ length: 10 }, (_, i) => ({
                    title: `Result ${i + 1}`,
                    link: `https://example.com/${i + 1}`,
                    snippet: `Snippet ${i + 1}`
                }))
            };

            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: mockResponse,
                statusText: 'OK'
            });

            const results = await service.search('test', undefined, 5);

            expect(results.length).toBeLessThanOrEqual(5);
        });

        it('should handle API errors gracefully', async () => {
            mockRequestUrl.mockRejectedValueOnce(new Error('Network error'));

            const results = await service.search('test');
            expect(results).toEqual([]);
        });

        it('should handle HTTP errors gracefully', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 429,
                json: {},
                statusText: 'Rate Limited'
            });

            const results = await service.search('test');
            expect(results).toEqual([]);
        });

        it('should handle timeout', async () => {
            const settings = { ...mockSettings, webSearchTimeout: 100 };
            const svc = new WebSearchService(settings);

            // Mock requestUrl to reject with timeout error
            const timeoutError = new Error('Timeout: Request exceeded 100ms');
            mockRequestUrl.mockRejectedValueOnce(timeoutError);

            const results = await svc.search('test');
            expect(results).toEqual([]);
        });

        it('should calculate relevance scores', async () => {
            const mockResponse = {
                items: [
                    {
                        title: 'Exact Match Test',
                        link: 'https://example.com',
                        snippet: 'This is a test snippet'
                    }
                ]
            };

            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: mockResponse,
                statusText: 'OK'
            });

            const results = await service.search('test', undefined, 5);

            expect(results[0].relevance).toBeDefined();
            expect(results[0].relevance).toBeGreaterThanOrEqual(0);
            expect(results[0].relevance).toBeLessThanOrEqual(1);
        });
    });
});

