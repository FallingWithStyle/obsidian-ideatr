import { Platform } from 'obsidian';

/**
 * Platform utility functions to replace Node.js os module
 * Uses Obsidian's Platform API where possible
 */

/**
 * Get the current platform (darwin, win32, linux)
 */
export function getPlatform(): string {
    if (Platform.isMacOS) return 'darwin';
    if (Platform.isWin) return 'win32';
    if (Platform.isLinux) return 'linux';
    // Fallback - try to detect from navigator (for web/unknown platforms)
    if (typeof navigator !== 'undefined') {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('mac') || platform.includes('darwin')) return 'darwin';
        if (platform.includes('win')) return 'win32';
        if (platform.includes('linux')) return 'linux';
    }
    return 'unknown';
}

/**
 * Get the current architecture (x64, arm64, etc.)
 * Note: This is a simplified version - Obsidian doesn't expose arch directly
 * For most use cases, we can infer from platform
 */
export function getArch(): string {
    // On macOS, check if it's Apple Silicon
    if (Platform.isMacOS) {
        // Try to detect Apple Silicon - this is a best-effort approach
        // In practice, we might need to check other indicators
        // For now, default to arm64 on macOS (most common) or x64
        // This could be enhanced with feature detection if needed
        return 'arm64'; // Default assumption for modern macOS
    }
    // For other platforms, default to x64
    return 'x64';
}

/**
 * Get home directory
 * Note: Obsidian doesn't provide direct access to home directory
 * This is a fallback that tries common patterns
 * For plugin-specific directories, consider using app.vault.configDir instead
 */
export function getHomeDir(): string {
    // Try to get from environment if available (Node.js context)
    if (typeof process !== 'undefined' && process.env?.HOME) {
        return process.env.HOME;
    }
    if (typeof process !== 'undefined' && process.env?.USERPROFILE) {
        return process.env.USERPROFILE;
    }
    // Fallback - this won't work in all contexts
    // For Obsidian plugins, prefer using vault paths or configDir
    throw new Error('Home directory not available. Use app.vault.configDir or vault paths instead.');
}

