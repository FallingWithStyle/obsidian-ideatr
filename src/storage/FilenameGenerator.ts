/**
 * FilenameGenerator - Generates safe, unique filenames for idea files
 * 
 * Follows the pattern: YYYY-MM-DD-slug.md
 * - Sanitizes text to create URL-safe slugs
 * - Truncates to reasonable length
 * - Handles collisions with numeric suffixes
 */

const MAX_SLUG_LENGTH = 50;

/**
 * Generate a filename from idea text and timestamp
 * Format: YYYY-MM-DD-slug.md
 */
export function generateFilename(ideaText: string, timestamp: Date): string {
    const datePrefix = formatDate(timestamp);
    const slug = sanitizeSlug(ideaText);
    return `${datePrefix}-${slug}.md`;
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
 * Sanitize text to create a URL-safe slug
 * - Convert to lowercase
 * - Remove special characters
 * - Replace spaces with hyphens
 * - Truncate to MAX_SLUG_LENGTH
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

    // Truncate to max length
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
 * Example: idea.md -> idea-2.md -> idea-3.md
 */
export function addCollisionSuffix(filename: string, suffix: number): string {
    const withoutExtension = filename.replace(/\.md$/, '');
    return `${withoutExtension}-${suffix}.md`;
}
