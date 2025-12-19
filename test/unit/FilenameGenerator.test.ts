import { describe, it, expect } from 'vitest';
import {
    generateFilename,
    formatDate,
    sanitizeSlug,
    sanitizeTitle,
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

    describe('sanitizeTitle', () => {
        it('should preserve original capitalization and spaces', () => {
            expect(sanitizeTitle('My Great Idea')).toBe('My Great Idea');
        });

        it('should remove filesystem-unsafe characters', () => {
            expect(sanitizeTitle('Idea: Test*File?')).toBe('Idea TestFile');
            expect(sanitizeTitle('File"Name<Test>')).toBe('FileNameTest');
            expect(sanitizeTitle('Path/To\\File')).toBe('PathToFile');
        });

        it('should collapse multiple spaces', () => {
            expect(sanitizeTitle('idea    with    spaces')).toBe('idea with spaces');
        });

        it('should trim whitespace', () => {
            expect(sanitizeTitle('  idea  ')).toBe('idea');
        });

        it('should truncate to max length', () => {
            const longText = 'a'.repeat(150);
            const title = sanitizeTitle(longText);
            expect(title.length).toBeLessThanOrEqual(100);
        });

        it('should handle empty string with fallback', () => {
            expect(sanitizeTitle('')).toBe('Untitled');
        });

        it('should handle only unsafe characters with fallback', () => {
            expect(sanitizeTitle(':*?"<>|/\\')).toBe('Untitled');
        });
    });

    describe('generateFilename', () => {
        it('should generate filename with title only', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('My Great Idea', date);
            expect(filename).toBe('My Great Idea.md');
        });

        it('should handle special characters in idea text', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('Idea! (v2.0)', date);
            expect(filename).toBe('Idea! (v2.0).md');
        });

        it('should remove filesystem-unsafe characters', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('Idea: Test*File?', date);
            expect(filename).toBe('Idea TestFile.md');
        });

        it('should truncate long idea text', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const longIdea = 'a'.repeat(150);
            const filename = generateFilename(longIdea, date);
            // Format: title + .md = 100 + 3 = 103 max
            expect(filename.length).toBeLessThanOrEqual(103);
        });

        it('should handle empty idea text with fallback', () => {
            const date = new Date('2025-11-28T17:00:00Z');
            const filename = generateFilename('', date);
            expect(filename).toBe('Untitled.md');
        });

        it('should work without timestamp parameter', () => {
            const filename = generateFilename('My Great Idea');
            expect(filename).toBe('My Great Idea.md');
        });
    });

    describe('addCollisionSuffix', () => {
        it('should add numeric suffix before extension', () => {
            expect(addCollisionSuffix('Idea.md', 2)).toBe('Idea-2.md');
        });

        it('should handle multiple suffixes', () => {
            expect(addCollisionSuffix('Idea.md', 10)).toBe('Idea-10.md');
        });

        it('should work with already suffixed filenames', () => {
            expect(addCollisionSuffix('Idea-2.md', 3)).toBe('Idea-2-3.md');
        });
    });
});
