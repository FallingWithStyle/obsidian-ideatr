import type { ValidationResult } from '../types/idea';

/**
 * InputValidator - Validates and sanitizes user input
 */

const MIN_IDEA_LENGTH = 3;
const MAX_IDEA_LENGTH = 5000;

/**
 * Validate idea text input
 */
export function validateIdeaText(text: string): ValidationResult {
    // Check if empty or only whitespace
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return {
            valid: false,
            error: 'Idea cannot be empty'
        };
    }

    // Check minimum length
    if (trimmed.length < MIN_IDEA_LENGTH) {
        return {
            valid: false,
            error: `Idea must be at least ${MIN_IDEA_LENGTH} characters`
        };
    }

    // Check maximum length
    if (trimmed.length > MAX_IDEA_LENGTH) {
        return {
            valid: false,
            error: `Idea must be less than ${MAX_IDEA_LENGTH} characters`
        };
    }

    // Sanitize input
    const sanitized = sanitizeInput(trimmed);

    return {
        valid: true,
        sanitizedText: sanitized
    };
}

/**
 * Sanitize input text
 * - Trim whitespace
 * - Normalize line breaks
 * - Remove null bytes and other dangerous characters
 */
export function sanitizeInput(text: string): string {
    return text
        .trim()
        // Remove null bytes
        .replace(/\0/g, '')
        // Normalize line breaks to \n
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive consecutive line breaks (max 2)
        .replace(/\n{3,}/g, '\n\n');
}
