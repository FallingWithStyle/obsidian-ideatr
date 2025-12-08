import { getPlatform, getArch } from './platformUtils';

/**
 * System capabilities information
 */
export interface SystemCapabilities {
    totalRAMGB: number;
    availableRAMGB: number;
    platform: string;
    arch: string;
}

/**
 * Get system capabilities (RAM, platform, etc.)
 * Note: RAM information is not available in Obsidian's API
 * This function provides platform/arch info, but RAM will be 0
 * For RAM checks, consider making them optional or using heuristics
 */
export function getSystemCapabilities(): SystemCapabilities {
    // RAM information is not available in Obsidian's API
    // We'll return 0 as a placeholder - callers should handle this gracefully
    // In practice, RAM checks might need to be optional or use different approaches
    const totalRAMGB = 0;
    const availableRAMGB = 0;

    return {
        totalRAMGB,
        availableRAMGB,
        platform: getPlatform(),
        arch: getArch()
    };
}

/**
 * Check if system has sufficient RAM for a model
 * @param modelKey - The model key to check (deprecated - local models no longer supported)
 * @param capabilities - Optional system capabilities (will be fetched if not provided)
 * @returns Object with isCompatible flag and warning message if incompatible
 * @deprecated Local models are no longer supported. This function always returns compatible.
 */
export function checkModelCompatibility(
    _modelKey: string,
    _capabilities?: SystemCapabilities
): { isCompatible: boolean; warning?: string; recommendation?: string } {
    // Local models are no longer supported
    return { isCompatible: true };
}

/**
 * Check if the system is running on Apple Silicon (M-series chips)
 * @returns true if running on macOS with ARM64 architecture
 */
export function isAppleSilicon(): boolean {
    const caps = getSystemCapabilities();
    return caps.platform === 'darwin' && caps.arch === 'arm64';
}

/**
 * Get a user-friendly system info string
 */
export function getSystemInfoString(): string {
    const caps = getSystemCapabilities();
    if (caps.totalRAMGB > 0) {
        return `System: ${caps.platform} ${caps.arch}, ${caps.totalRAMGB.toFixed(1)}GB total RAM`;
    }
    return `System: ${caps.platform} ${caps.arch}`;
}

