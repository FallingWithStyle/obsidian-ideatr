import { describe, it, expect } from 'vitest';
import { extractIdeaNameSync } from '../../src/services/NameVariantService';

describe('extractIdeaNameSync', () => {
    it('should extract first line and truncate to 50 characters', () => {
        const ideaText = 'TaskMaster - A productivity app for managing tasks';
        const result = extractIdeaNameSync(ideaText);
        // Should truncate to 50 chars, then clean special characters
        expect(result.length).toBeLessThanOrEqual(50);
        expect(result).toContain('TaskMaster');
    });

    it('should handle single line ideas', () => {
        const ideaText = 'Simple idea name';
        const result = extractIdeaNameSync(ideaText);
        expect(result).toBe('Simple idea name');
    });

    it('should extract first line from multi-line text', () => {
        const ideaText = 'First line idea\nSecond line\nThird line';
        const result = extractIdeaNameSync(ideaText);
        expect(result).toBe('First line idea');
    });

    it('should remove special characters', () => {
        const ideaText = 'Task@Master! #productivity (app)';
        const result = extractIdeaNameSync(ideaText);
        expect(result).toBe('TaskMaster productivity app');
    });

    it('should keep alphanumeric, spaces, and hyphens', () => {
        const ideaText = 'Task-Master 2024 v2.0';
        const result = extractIdeaNameSync(ideaText);
        expect(result).toBe('Task-Master 2024 v20');
    });

    it('should handle empty text', () => {
        const result = extractIdeaNameSync('');
        expect(result).toBe('');
    });

    it('should handle whitespace-only text', () => {
        const result = extractIdeaNameSync('   \n\t  ');
        expect(result).toBe('');
    });

    it('should use full text if first line is too short', () => {
        const ideaText = 'Hi\nThis is a longer idea description that should be used';
        const result = extractIdeaNameSync(ideaText);
        // Should use first 50 chars of full text after cleaning
        expect(result.length).toBeGreaterThan(2);
    });

    it('should truncate long names to 50 characters', () => {
        const ideaText = 'A'.repeat(100);
        const result = extractIdeaNameSync(ideaText);
        expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle text with only special characters', () => {
        const ideaText = '@#$%^&*()';
        const result = extractIdeaNameSync(ideaText);
        // Should fall back to first 50 chars of full text
        expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should trim leading and trailing whitespace', () => {
        const ideaText = '   TaskMaster   ';
        const result = extractIdeaNameSync(ideaText);
        expect(result).toBe('TaskMaster');
    });
});

