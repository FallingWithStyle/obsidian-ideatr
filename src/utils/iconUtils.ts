import { setIcon } from 'obsidian';

/**
 * Icon IDs for the Ideatr custom icons
 * These are registered in main.ts using the base64-encoded PNG icons
 */
export const IDEATR_ICON_ID = 'ideatr-icon-purple';
export const IDEATR_ICON_GREEN = 'ideatr-icon-green';
export const IDEATR_ICON_YELLOW = 'ideatr-icon-yellow';
export const IDEATR_ICON_RED = 'ideatr-icon-red';

/**
 * Helper function to create an SVG wrapper for a PNG image
 * This allows PNG images to be used with Obsidian's icon system
 * 
 * @param imageDataUri - Base64 data URI of the PNG image (e.g., 'data:image/png;base64,iVBORw0KG...')
 * @param size - Size of the icon (default: 24)
 * @returns SVG string that can be used with addIcon()
 */
export function createPNGIconSVG(imageDataUri: string, size: number = 24): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <image href="${imageDataUri}" width="${size}" height="${size}"/>
    </svg>`;
}

/**
 * Get the icon ID for a given model status
 * Maps status to appropriate colored icon:
 * - connected -> green
 * - loading -> yellow
 * - not-connected -> red
 * - error -> red
 */
export function getStatusIconId(status: 'connected' | 'loading' | 'not-connected' | 'error'): string {
    switch (status) {
        case 'connected':
            return IDEATR_ICON_GREEN;
        case 'loading':
            return IDEATR_ICON_YELLOW;
        case 'not-connected':
        case 'error':
            return IDEATR_ICON_RED;
        default:
            return IDEATR_ICON_ID;
    }
}

/**
 * Utility functions for creating consistent icons across the plugin
 */

/**
 * Creates an icon element using the primary purple icon
 * Uses Obsidian's setIcon utility to ensure perfect consistency across all icon usages
 * 
 * @param className - Optional CSS class to add to the icon
 * @returns HTMLSpanElement containing the icon (rendered by Obsidian)
 */
export function createLightbulbIcon(className?: string): HTMLSpanElement {
    const icon = document.createElement('span');
    if (className) {
        icon.className = className;
    }
    // Use Obsidian's setIcon to render the icon - this ensures it matches the ribbon icon exactly
    setIcon(icon, IDEATR_ICON_ID);
    return icon;
}

/**
 * Creates a status icon element with the appropriate color based on status
 * 
 * @param status - The model connection status
 * @param className - Optional CSS class to add to the icon
 * @returns HTMLSpanElement containing the colored status icon
 */
export function createStatusIcon(status: 'connected' | 'loading' | 'not-connected' | 'error', className?: string): HTMLSpanElement {
    const icon = document.createElement('span');
    if (className) {
        icon.className = className;
    }
    setIcon(icon, getStatusIconId(status));
    return icon;
}


