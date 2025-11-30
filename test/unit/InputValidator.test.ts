import { describe, it, expect } from 'vitest';
import { validateIdeaText, sanitizeInput } from '../../src/capture/InputValidator';

describe('InputValidator', () => {
    describe('validateIdeaText', () => {
        it('should accept valid idea text', () => {
            const result = validateIdeaText('This is a valid idea');
            expect(result.valid).toBe(true);
            expect(result.sanitizedText).toBe('This is a valid idea');
            expect(result.error).toBeUndefined();
        });

        it('should reject empty string', () => {
            const result = validateIdeaText('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Idea cannot be empty');
        });

        it('should reject whitespace-only string', () => {
            const result = validateIdeaText('   ');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Idea cannot be empty');
        });

        it('should reject text shorter than 3 characters', () => {
            const result = validateIdeaText('ab');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 3 characters');
        });

        it('should accept text exactly 3 characters', () => {
            const result = validateIdeaText('abc');
            expect(result.valid).toBe(true);
        });

        it('should reject text longer than 5000 characters', () => {
            const longText = 'a'.repeat(5001);
            const result = validateIdeaText(longText);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('less than 5000 characters');
        });

        it('should accept text exactly 5000 characters', () => {
            const longText = 'a'.repeat(5000);
            const result = validateIdeaText(longText);
            expect(result.valid).toBe(true);
        });

        it('should trim whitespace from input', () => {
            const result = validateIdeaText('  idea with spaces  ');
            expect(result.valid).toBe(true);
            expect(result.sanitizedText).toBe('idea with spaces');
        });

        it('should sanitize input when valid', () => {
            const result = validateIdeaText('idea\r\nwith\r\nwindows\r\nline\r\nbreaks');
            expect(result.valid).toBe(true);
            expect(result.sanitizedText).toBe('idea\nwith\nwindows\nline\nbreaks');
        });
    });

    describe('sanitizeInput', () => {
        it('should trim whitespace', () => {
            expect(sanitizeInput('  text  ')).toBe('text');
        });

        it('should remove null bytes', () => {
            expect(sanitizeInput('text\0with\0nulls')).toBe('textwithnulls');
        });

        it('should normalize Windows line breaks', () => {
            expect(sanitizeInput('line1\r\nline2')).toBe('line1\nline2');
        });

        it('should normalize Mac line breaks', () => {
            expect(sanitizeInput('line1\rline2')).toBe('line1\nline2');
        });

        it('should preserve Unix line breaks', () => {
            expect(sanitizeInput('line1\nline2')).toBe('line1\nline2');
        });

        it('should collapse excessive line breaks', () => {
            expect(sanitizeInput('line1\n\n\n\nline2')).toBe('line1\n\nline2');
        });

        it('should preserve double line breaks', () => {
            expect(sanitizeInput('line1\n\nline2')).toBe('line1\n\nline2');
        });

        it('should handle mixed line break types', () => {
            expect(sanitizeInput('line1\r\nline2\rline3\nline4')).toBe('line1\nline2\nline3\nline4');
        });
    });
});
