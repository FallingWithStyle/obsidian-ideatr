import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLMService } from '../../src/services/MockLLMService';
import type { ClassificationResult } from '../../src/types/classification';

describe('MockLLMService', () => {
    let service: MockLLMService;

    beforeEach(() => {
        service = new MockLLMService();
    });

    describe('classify', () => {
        it('should return a classification result with category and tags', async () => {
            const text = 'A productivity app for managing tasks';
            const result = await service.classify(text);

            expect(result).toBeDefined();
            expect(result.category).toBeDefined();
            expect(result.tags).toBeDefined();
            expect(Array.isArray(result.tags)).toBe(true);
        });

        it('should classify SaaS-related ideas as "saas"', async () => {
            const text = 'A web app for team collaboration';
            const result = await service.classify(text);

            expect(result.category).toBe('saas');
        });

        it('should classify game-related ideas as "game"', async () => {
            const text = 'A roguelike dungeon crawler with procedural generation';
            const result = await service.classify(text);

            expect(result.category).toBe('game');
        });

        it('should return 3-5 tags', async () => {
            const text = 'A mobile app for tracking fitness goals';
            const result = await service.classify(text);

            expect(result.tags.length).toBeGreaterThanOrEqual(3);
            expect(result.tags.length).toBeLessThanOrEqual(5);
        });

        it('should return relevant tags based on content', async () => {
            const text = 'A productivity tool for developers';
            const result = await service.classify(text);

            const tagString = result.tags.join(' ').toLowerCase();
            expect(
                tagString.includes('productivity') ||
                tagString.includes('developer') ||
                tagString.includes('tool')
            ).toBe(true);
        });

        it('should handle empty text gracefully', async () => {
            const text = '';
            const result = await service.classify(text);

            expect(result.category).toBe('');
            expect(result.tags).toEqual([]);
        });

        it('should include confidence score', async () => {
            const text = 'A note-taking app';
            const result = await service.classify(text);

            expect(result.confidence).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('should classify tool-related ideas as "tool"', async () => {
            const text = 'A CLI utility for file conversion';
            const result = await service.classify(text);

            expect(result.category).toBe('tool');
        });

        it('should classify story-related ideas as "story"', async () => {
            const text = 'A sci-fi narrative about time travel';
            const result = await service.classify(text);

            expect(result.category).toBe('story');
        });

        it('should classify hardware ideas as "hardware"', async () => {
            const text = 'A smart home device for energy monitoring';
            const result = await service.classify(text);

            expect(result.category).toBe('hardware');
        });
    });

    describe('isAvailable', () => {
        it('should return true for mock service', () => {
            expect(service.isAvailable()).toBe(true);
        });
    });
});
