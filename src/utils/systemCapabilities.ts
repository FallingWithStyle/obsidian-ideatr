import * as os from 'os';
import { MODELS } from '../services/ModelManager';
import { Logger } from './logger';

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
 */
export function getSystemCapabilities(): SystemCapabilities {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const totalRAMGB = totalBytes / (1024 * 1024 * 1024);
    const availableRAMGB = freeBytes / (1024 * 1024 * 1024);

    return {
        totalRAMGB,
        availableRAMGB,
        platform: os.platform(),
        arch: os.arch()
    };
}

/**
 * Parse RAM requirement from model config (e.g., "48GB+" -> 48, "6-8GB" -> 6)
 */
function parseRAMRequirement(ramString: string): number {
    // Remove "GB" and "+" signs, extract first number
    const match = ramString.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return 0;
}

/**
 * Check if system has sufficient RAM for a model
 * @param modelKey - The model key to check
 * @param capabilities - Optional system capabilities (will be fetched if not provided)
 * @returns Object with isCompatible flag and warning message if incompatible
 */
export function checkModelCompatibility(
    modelKey: string,
    capabilities?: SystemCapabilities
): { isCompatible: boolean; warning?: string; recommendation?: string } {
    const modelConfig = MODELS[modelKey];
    if (!modelConfig) {
        Logger.warn(`Unknown model key: ${modelKey}`);
        return { isCompatible: true }; // Don't block unknown models
    }

    const systemInfo = capabilities || getSystemCapabilities();
    const requiredRAM = parseRAMRequirement(modelConfig.ram);
    const totalRAM = systemInfo.totalRAMGB;

    // If model requires more RAM than system has, warn
    if (requiredRAM > totalRAM) {
        const warning = `This model requires ${modelConfig.ram} RAM, but your system has ${totalRAM.toFixed(1)}GB total RAM. The model may fail to load.`;
        const recommendation = `Consider using a smaller model like "Phi-3.5 Mini" (requires 6-8GB RAM) instead.`;
        return {
            isCompatible: false,
            warning,
            recommendation
        };
    }

    // If model requires close to total RAM (within 20%), warn
    if (requiredRAM > totalRAM * 0.8) {
        const warning = `This model requires ${modelConfig.ram} RAM. Your system has ${totalRAM.toFixed(1)}GB total RAM. The model may struggle or fail to load if other applications are using memory.`;
        const recommendation = `Ensure you have at least ${requiredRAM}GB free RAM before loading this model.`;
        return {
            isCompatible: true, // Still compatible, but risky
            warning,
            recommendation
        };
    }

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
    return `System: ${caps.platform} ${caps.arch}, ${caps.totalRAMGB.toFixed(1)}GB total RAM`;
}

