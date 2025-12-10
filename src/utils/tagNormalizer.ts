/**
 * Normalize tags to ensure they are single words or use underscores
 * - Converts spaces to underscores
 * - Removes special characters (keeps alphanumeric and underscores)
 * - Converts to lowercase
 * - Removes leading/trailing underscores
 */
export function normalizeTag(tag: string): string {
    if (!tag || typeof tag !== 'string') {
        return '';
    }

    return tag
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^a-z0-9_]/g, '') // Remove special characters, keep alphanumeric and underscores
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .replace(/_+/g, '_'); // Replace multiple underscores with single underscore
}

/**
 * Normalize an array of tags
 */
export function normalizeTags(tags: string[]): string[] {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags
        .map(tag => normalizeTag(tag))
        .filter(tag => tag.length > 0) // Remove empty tags
        .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
}
