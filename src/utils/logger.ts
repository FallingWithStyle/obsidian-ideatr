import type { App, Vault } from 'obsidian';

/**
 * Logger utility that gates debug/info logs based on developer mode
 * Only shows debug logs if:
 * - Debug mode is enabled in settings (primary method)
 * - Debug flag file exists in vault root (secondary, for developers)
 * 
 * To enable debug mode via file: Create `.ideatr-debug` in your vault root
 * Error logs are always shown (use console.error directly for critical errors)
 */
export class Logger {
    private static app: App | null = null;
    private static debugMode: boolean = false;
    private static debugFileChecked: boolean = false;
    private static debugFileExists: boolean = false;
    private static readonly DEBUG_FILE_NAME = '.ideatr-debug';

    /**
     * Initialize the logger with app instance and debug mode setting
     */
    static initialize(app: App | null, debugMode: boolean = false): void {
        Logger.app = app;
        Logger.debugMode = debugMode;
        // Check for debug file asynchronously (non-blocking)
        if (app?.vault) {
            Logger.checkDebugFile(app.vault).catch(() => {
                // Silently fail - debug file check is optional
            });
        }
    }

    /**
     * Check if debug flag file exists in vault root
     * This is a simple way for developers to enable debug mode without changing settings
     */
    private static async checkDebugFile(vault: Vault): Promise<void> {
        if (Logger.debugFileChecked) {
            return;
        }

        try {
            const debugFile = vault.getAbstractFileByPath(Logger.DEBUG_FILE_NAME);
            Logger.debugFileExists = debugFile !== null;
        } catch {
            Logger.debugFileExists = false;
        } finally {
            Logger.debugFileChecked = true;
        }
    }

    /**
     * Check if debug mode is enabled
     */
    private static isDebugEnabled(): boolean {
        // Primary: Check explicit debug mode setting (user-controlled)
        if (Logger.debugMode) {
            return true;
        }

        // Secondary: Check for debug flag file (developer convenience)
        // Re-check file if not yet checked (for cases where vault loads after initialization)
        if (!Logger.debugFileChecked && Logger.app?.vault) {
            Logger.checkDebugFile(Logger.app.vault).catch(() => {
                // Silently fail
            });
        }

        if (Logger.debugFileExists) {
            return true;
        }

        return false;
    }

    /**
     * Log debug information (only shown in debug mode)
     */
    static debug(...args: any[]): void {
        if (Logger.isDebugEnabled()) {
            console.log('[Ideatr Debug]', ...args);
        }
    }

    /**
     * Log informational messages (only shown in debug mode)
     */
    static info(...args: any[]): void {
        if (Logger.isDebugEnabled()) {
            console.log('[Ideatr]', ...args);
        }
    }

    /**
     * Log warnings (only shown in debug mode)
     * For warnings that should always be shown, use console.warn directly
     */
    static warn(...args: any[]): void {
        if (Logger.isDebugEnabled()) {
            console.warn('[Ideatr]', ...args);
        }
    }

    /**
     * Log errors (always shown - use console.error directly for critical errors)
     * This is for non-critical errors that can be gated
     */
    static error(...args: any[]): void {
        if (Logger.isDebugEnabled()) {
            console.error('[Ideatr]', ...args);
        }
    }

    /**
     * Log with a specific tag/context (only shown in debug mode)
     */
    static log(tag: string, ...args: any[]): void {
        if (Logger.isDebugEnabled()) {
            console.log(`[Ideatr:${tag}]`, ...args);
        }
    }
}

