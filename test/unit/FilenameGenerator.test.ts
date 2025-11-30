import { describe, it, expect } from 'vitest';
import {
    generateFilename,
    formatDate,
    sanitizeSlug,
    addCollisionSuffix
} from '../../src/storage/FilenameGenerator';

describe('FilenameGenerator', () => {
    describe('formatDate', () => {
        it('should format date as YYYY-MM-DD', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            expect(formatDate(date)).toBe('2025-11-28');
        });

        it('should pad single-digit months and days with zeros', () => {
            const date = new Date('2025-01-05T17:00:00Z');
            expect(formatDate(date)).toBe('2025-01-05');
        });
    });

    describe('sanitizeSlug', () => {
        it('should convert to lowercase', () => {
            expect(sanitizeSlug('My Great Idea')).toBe('my-great-idea');
        });

        it('should replace spaces with hyphens', () => {
            expect(sanitizeSlug('idea with spaces')).toBe('idea-with-spaces');
        });

        it('should remove special characters', () => {
            expect(sanitizeSlug('idea!@#$%^&*()test')).toBe('ideatest');
        });

        it('should handle unicode characters by removing them', () => {
            expect(sanitizeSlug('café résumé')).toBe('caf-rsum');
        });

        it('should replace multiple spaces with single hyphen', () => {
            expect(sanitizeSlug('idea    with    spaces')).toBe('idea-with-spaces');
        });

        it('should remove leading and trailing hyphens', () => {
            expect(sanitizeSlug('---idea---')).toBe('idea');
        });

        it('should truncate to 50 characters', () => {
            const longText = 'a'.repeat(100);
            const slug = sanitizeSlug(longText);
            expect(slug.length).toBeLessThanOrEqual(50);
        });

        it('should not end with hyphen after truncation', () => {
            const longText = 'a'.repeat(45) + '-' + 'b'.repeat(10);
            const slug = sanitizeSlug(longText);
            expect(slug).not.toMatch(/-$/);
        });

        it('should handle empty string with fallback', () => {
            expect(sanitizeSlug('')).toBe('untitled');
        });

        it('should handle only special characters with fallback', () => {
            expect(sanitizeSlug('!@#$%^&*()')).toBe('untitled');
        });

        it('should preserve numbers', () => {
            expect(sanitizeSlug('idea 123 test')).toBe('idea-123-test');
        });

        it('should replace underscores with hyphens', () => {
            expect(sanitizeSlug('idea_with_underscores')).toBe('idea-with-underscores');
        });

        it('should handle mixed case and special chars', () => {
            expect(sanitizeSlug('My Idea! (v2.0)')).toBe('my-idea-v20');
        });

        it('should collapse multiple hyphens', () => {
            expect(sanitizeSlug('idea---test')).toBe('idea-test');
        });
    });

    describe('generateFilename', () => {
        it('should generate filename with date prefix and slug', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('My Great Idea', date);
            expect(filename).toBe('2025-11-28-my-great-idea.md');
        });

        it('should handle special characters in idea text', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('Idea! (v2.0)', date);
            expect(filename).toBe('2025-11-28-idea-v20.md');
        });

        it('should truncate long idea text', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const longIdea = 'a'.repeat(100);
            const filename = generateFilename(longIdea, date);
            expect(filename.length).toBeLessThanOrEqual(11 + 50 + 3); // date + slug + .md
        });

        it('should handle empty idea text with fallback', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('', date);
            expect(filename).toBe('2025-11-28-untitled.md');
        });
    });

    describe('addCollisionSuffix', () => {
        it('should add numeric suffix before extension', () => {
            expect(addCollisionSuffix('2025-11-28-idea.md', 2)).toBe('2025-11-28-idea-2.md');
        });

        it('should handle multiple suffixes', () => {
            expect(addCollisionSuffix('2025-11-28-idea.md', 10)).toBe('2025-11-28-idea-10.md');
        });

        it('should work with already suffixed filenames', () => {
            expect(addCollisionSuffix('2025-11-28-idea-2.md', 3)).toBe('2025-11-28-idea-2-3.md');
        });
    });
});
