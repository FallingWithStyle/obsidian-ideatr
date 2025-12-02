import type { App, Vault } from 'obsidian';

/**
 * Logger utility that gates debug/info logs based on developer mode
 * Only shows debug logs if:
 * - Debug mode is enabled in settings (primary method)
 * - Debug flag file exists in vault root (secondary, for developers)
 * 
 * To enable debug mode via file: Create `.ideatr-debug` or `.ideatr-debug.md` in your vault root
 * Error logs are always shown (use console.error directly for critical errors)
 */
export class Logger {
    private static app: App | null = null;
    private static debugMode: boolean = false;
    private static debugFileChecked: boolean = false;
    private static debugFileExists: boolean = false;
    private static readonly DEBUG_FILE_NAMES = ['.ideatr-debug', '.ideatr-debug.md'];
    private static checkPromise: Promise<void> | null = null;
    private static lastRecheckTime: number = 0;
    private static readonly RECHECK_INTERVAL_MS = 5000; // Recheck every 5 seconds

    /**
     * Initialize the logger with app instance and debug mode setting
     */
    static initialize(app: App | null, debugMode: boolean = false): void {
        Logger.app = app;
        Logger.debugMode = debugMode;
        // Reset check state to allow rechecking
        Logger.debugFileChecked = false;
        Logger.debugFileExists = false;
        // Check for debug file asynchronously (non-blocking)
        if (app?.vault) {
            Logger.checkDebugFile(app.vault).catch(() => {
                // Silently fail - debug file check is optional
            });
        }
    }

    /**
     * Force recheck of debug file (useful if file was created after plugin load)
     */
    static forceRecheckDebugFile(): void {
        if (Logger.app?.vault) {
            Logger.debugFileChecked = false;
            Logger.debugFileExists = false;
            Logger.checkDebugFile(Logger.app.vault).catch(() => {
                // Silently fail
            });
        }
    }

    /**
     * Check if debug flag file exists in vault root
     * This is a simple way for developers to enable debug mode without changing settings
     * Checks for both `.ideatr-debug` and `.ideatr-debug.md`
     */
    private static async checkDebugFile(vault: Vault): Promise<void> {
        // If already checked and we have a pending promise, wait for it
        if (Logger.debugFileChecked && Logger.checkPromise) {
            await Logger.checkPromise;
            return;
        }

        // If already checked, return early
        if (Logger.debugFileChecked) {
            return;
        }

        // Create a promise for this check
        Logger.checkPromise = (async () => {
            try {
                // Check for both possible file names
                for (const fileName of Logger.DEBUG_FILE_NAMES) {
                    const debugFile = vault.getAbstractFileByPath(fileName);
                    if (debugFile !== null) {
                        Logger.debugFileExists = true;
                        Logger.debugFileChecked = true;
                        Logger.checkPromise = null;
                        return;
                    }
                }
                Logger.debugFileExists = false;
            } catch {
                Logger.debugFileExists = false;
            } finally {
                Logger.debugFileChecked = true;
                Logger.checkPromise = null;
            }
        })();

        await Logger.checkPromise;
    }

    /**
     * Synchronously check if debug file exists (for immediate use)
     */
    private static checkDebugFileSync(): boolean {
        if (!Logger.app?.vault) {
            return false;
        }

        try {
            // Check for both possible file names synchronously
            for (const fileName of Logger.DEBUG_FILE_NAMES) {
                const debugFile = Logger.app.vault.getAbstractFileByPath(fileName);
                if (debugFile !== null) {
                    return true;
                }
            }
        } catch {
            // Silently fail
        }
        return false;
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
        // If not yet checked, do a synchronous check first for immediate result
        if (!Logger.debugFileChecked && Logger.app?.vault) {
            const exists = Logger.checkDebugFileSync();
            Logger.debugFileExists = exists;
            Logger.debugFileChecked = true;
            // Also trigger async check to ensure we catch any edge cases
            Logger.checkDebugFile(Logger.app.vault).catch(() => {
                // Silently fail
            });
            return exists;
        }

        // If already checked, use cached result
        // Periodically recheck in case file was created/removed after plugin load
        if (Logger.app?.vault) {
            const now = Date.now();
            if (now - Logger.lastRecheckTime > Logger.RECHECK_INTERVAL_MS) {
                const currentlyExists = Logger.checkDebugFileSync();
                if (currentlyExists !== Logger.debugFileExists) {
                    // File state changed, update cache
                    Logger.debugFileExists = currentlyExists;
                }
                Logger.lastRecheckTime = now;
            }
        }

        return Logger.debugFileExists;
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

