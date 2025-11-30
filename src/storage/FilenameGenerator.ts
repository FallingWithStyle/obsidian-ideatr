/**
 * FilenameGenerator - Generates safe, unique filenames for idea files
 * 
 * Follows the pattern: [YYYY-MM-DD] Title.md
 * - Preserves original capitalization and spaces
 * - Sanitizes filesystem-unsafe characters
 * - Truncates to reasonable length
 * - Handles collisions with numeric suffixes
 */

const MAX_TITLE_LENGTH = 100;

/**
 * Generate a filename from idea text and timestamp
 * Format: [YYYY-MM-DD] Title.md
 */
export function generateFilename(ideaText: string, timestamp: Date): string {
    const datePrefix = formatDate(timestamp);
    const title = sanitizeTitle(ideaText);
    return `[${datePrefix}] ${title}.md`;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Sanitize text to create a filesystem-safe title
 * - Preserves original capitalization and spaces
 * - Removes filesystem-unsafe characters (:, *, ?, ", <, >, |, /, \)
 * - Truncates to MAX_TITLE_LENGTH
 * - Trims whitespace
 */
export function sanitizeTitle(text: string): string {
    let title = text
        .trim()
        // Remove filesystem-unsafe characters
        .replace(/[:*?"<>|/\\]/g, '')
        // Collapse multiple spaces into single space
        .replace(/\s+/g, ' ')
        // Remove leading/trailing spaces
        .trim();

    // Truncate to max length
    if (title.length > MAX_TITLE_LENGTH) {
        title = title.substring(0, MAX_TITLE_LENGTH).trim();
    }

    // Fallback if title is empty
    if (title.length === 0) {
        title = 'Untitled';
    }

    return title;
}

/**
 * Sanitize text to create a URL-safe slug (kept for backward compatibility)
 * - Convert to lowercase
 * - Remove special characters
 * - Replace spaces with hyphens
 * - Truncate to reasonable length
 * - Remove leading/trailing hyphens
 */
export function sanitizeSlug(text: string): string {
    let slug = text
        .toLowerCase()
        .trim()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove all non-alphanumeric characters except hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Replace multiple consecutive hyphens with single hyphen
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');

    // Truncate to max length (using old MAX_SLUG_LENGTH for backward compatibility)
    const MAX_SLUG_LENGTH = 50;
    if (slug.length > MAX_SLUG_LENGTH) {
        slug = slug.substring(0, MAX_SLUG_LENGTH);
        // Remove trailing hyphen if truncation created one
        slug = slug.replace(/-+$/, '');
    }

    // Fallback if slug is empty
    if (slug.length === 0) {
        slug = 'untitled';
    }

    return slug;
}

/**
 * Add numeric suffix to filename to handle collisions
 * Example: [2025-11-30] Title.md -> [2025-11-30] Title-2.md -> [2025-11-30] Title-3.md
 */
export function addCollisionSuffix(filename: string, suffix: number): string {
    const withoutExtension = filename.replace(/\.md$/, '');
    return `${withoutExtension}-${suffix}.md`;
}
