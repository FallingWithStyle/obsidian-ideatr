/**
 * Path utility functions to replace Node.js path module
 * Uses simple string operations instead of Node.js builtins
 */

/**
 * Join path segments with forward slashes
 * Normalizes separators to forward slashes (works on all platforms in Obsidian)
 */
export function joinPath(...segments: string[]): string {
    return segments
        .filter(segment => segment.length > 0)
        .map(segment => segment.replace(/\\/g, '/').replace(/\/+/g, '/'))
        .join('/')
        .replace(/\/$/, ''); // Remove trailing slash
}

/**
 * Resolve a path (simplified - just normalizes the path)
 * For absolute paths, returns as-is. For relative paths, joins with current directory.
 */
export function resolvePath(...segments: string[]): string {
    const joined = joinPath(...segments);
    // If it's already absolute (starts with / or has drive letter), return as-is
    if (joined.startsWith('/') || /^[A-Za-z]:/.test(joined)) {
        return joined.replace(/\/+/g, '/');
    }
    return joined.replace(/\/+/g, '/');
}

/**
 * Check if a path is absolute
 */
export function isAbsolutePath(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
}

