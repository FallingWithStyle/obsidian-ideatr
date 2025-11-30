import { describe, it, expect, beforeEach } from 'vitest';
import { SearchQueryGenerator } from '../../src/services/SearchQueryGenerator';
import type { IdeaCategory } from '../../src/types/classification';

describe('SearchQueryGenerator', () => {
    let generator: SearchQueryGenerator;

    beforeEach(() => {
        generator = new SearchQueryGenerator();
    });

    describe('generateQuery', () => {
        it('should generate query for app/software category', () => {
            const text = 'TaskMaster - A task management app';
            const query = generator.generateQuery(text, 'saas');
            
            expect(query).toContain('TaskMaster');
            expect(query).toMatch(/app|software|tool/i);
        });

        it('should generate query for game category', () => {
            const text = 'Procedural generation game mechanic';
            const query = generator.generateQuery(text, 'game');
            
            expect(query).toContain('Procedural generation');
            expect(query).toMatch(/game|gameplay/i);
        });

        it('should generate query for product/hardware category', () => {
            const text = 'Smart watch with health tracking';
            const query = generator.generateQuery(text, 'hardware');
            
            expect(query).toContain('Smart watch');
            expect(query).toMatch(/product|hardware|device/i);
        });

        it('should generate query for story/fiction category', () => {
            const text = 'Time travel mystery novel';
            const query = generator.generateQuery(text, 'story');
            
            expect(query).toContain('Time travel mystery');
            expect(query).toMatch(/book|novel|story/i);
        });

        it('should generate query for service category', () => {
            const text = 'Task management service platform';
            const query = generator.generateQuery(text, 'service');
            
            expect(query).toContain('Task management');
            expect(query).toMatch(/service|platform/i);
        });

        it('should generate default query for unknown category', () => {
            const text = 'Some innovative idea';
            const query = generator.generateQuery(text, '');
            
            expect(query).toContain('Some innovative idea');
        });

        it('should extract key terms from idea text', () => {
            const text = 'A revolutionary new way to manage tasks';
            const query = generator.generateQuery(text, 'saas');
            
            expect(query.length).toBeGreaterThan(0);
            expect(query).toMatch(/task|manage/i);
        });
    });

    describe('generateQueryVariations', () => {
        it('should generate multiple query variations for app category', () => {
            const text = 'TaskMaster app';
            const variations = generator.generateQueryVariations(text, 'saas');
            
            expect(variations.length).toBeGreaterThanOrEqual(2);
            variations.forEach(v => {
                expect(v).toContain('TaskMaster');
            });
        });

        it('should generate multiple query variations for game category', () => {
            const text = 'Procedural generation';
            const variations = generator.generateQueryVariations(text, 'game');
            
            expect(variations.length).toBeGreaterThanOrEqual(2);
        });

        it('should generate variations for default category', () => {
            const text = 'Innovative idea';
            const variations = generator.generateQueryVariations(text, '');
            
            expect(variations.length).toBeGreaterThanOrEqual(2);
        });

        it('should return at least 2 variations', () => {
            const text = 'Test idea';
            const variations = generator.generateQueryVariations(text, 'saas');
            
            expect(variations.length).toBeGreaterThanOrEqual(2);
            expect(variations.length).toBeLessThanOrEqual(3);
        });
    });

    describe('edge cases', () => {
        it('should handle empty text', () => {
            const query = generator.generateQuery('', 'saas');
            expect(query).toBe('');
        });

        it('should handle very short text', () => {
            const query = generator.generateQuery('App', 'saas');
            expect(query.length).toBeGreaterThan(0);
        });

        it('should handle text with special characters', () => {
            const text = 'Task-Manager 2.0 (beta)';
            const query = generator.generateQuery(text, 'saas');
            expect(query.length).toBeGreaterThan(0);
        });

        it('should use project name when provided', () => {
            const text = 'A task management tool';
            const projectName = 'TaskMaster';
            const query = generator.generateQuery(text, 'saas', projectName);
            
            expect(query).toContain('TaskMaster');
            expect(query).toMatch(/app|software|tool/i);
        });

        it('should auto-detect project name from text when not provided', () => {
            const text = 'TaskMaster - A task management app';
            const query = generator.generateQuery(text, 'saas');
            
            // Should extract and use TaskMaster from the text
            expect(query).toContain('TaskMaster');
        });

        it('should prioritize project name in query variations', () => {
            const text = 'A revolutionary tool';
            const projectName = 'RevTool';
            const variations = generator.generateQueryVariations(text, 'saas', projectName);
            
            variations.forEach(v => {
                expect(v).toContain('RevTool');
            });
        });
    });
});

