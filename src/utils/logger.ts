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
    private static debugMode: boolean = true;
    private static debugFileChecked: boolean = false;
    private static debugFileExists: boolean = false;
    private static readonly DEBUG_FILE_NAMES = ['.ideatr-debug', '.ideatr-debug.md'];
    private static checkPromise: Promise<void> | null = null;

    /**
     * Initialize the logger with app instance and debug mode setting
     */
    static async initialize(app: App | null, debugMode: boolean = true): Promise<void> {
        Logger.app = app;
        Logger.debugMode = debugMode; // Use parameter (defaults to true for troubleshooting)
        // Reset check state to allow rechecking
        Logger.debugFileChecked = false;
        Logger.debugFileExists = false;

        // Check for debug file asynchronously (non-blocking)
        if (app?.vault) {
            await Logger.checkDebugFile(app.vault);
        }

        if (Logger.isDebugEnabled()) {
            console.debug('[Ideatr] Logger initialized in DEBUG mode');
        }
        
        // Log deploy timestamp if available (async, non-blocking)
        Logger.logDeployTimestamp().catch(() => {
            // Silently fail
        });
    }

    /**
     * Log the deploy timestamp if available
     */
    private static async logDeployTimestamp(): Promise<void> {
        try {
            if (!Logger.app?.vault) {
                return;
            }

            // The deploy-timestamp.json file is in the plugin directory
            // Path: {configDir}/plugins/ideatr/deploy-timestamp.json
            const configDir = Logger.app.vault.configDir;
            const timestampPath = `${configDir}/plugins/ideatr/deploy-timestamp.json`;
            
            // Check if file exists
            const exists = await Logger.app.vault.adapter.exists(timestampPath);
            if (!exists) {
                Logger.debug('Deploy timestamp file not found (this is normal for first deploy)');
                return;
            }

            // Read the file
            const content = await Logger.app.vault.adapter.read(timestampPath);
            const timestampData = JSON.parse(content) as { deployedAtReadable?: string; deployedAt?: string };
            
            const deployedAt = timestampData.deployedAtReadable ?? timestampData.deployedAt;
            console.debug(`[Ideatr] Last deployed: ${deployedAt}`);
            Logger.info(`Last deployed: ${deployedAt}`);
        } catch (error) {
            // Silently fail - deploy timestamp is optional
            Logger.debug('Could not read deploy timestamp:', error);
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
                // Check for both possible file names using adapter to see dotfiles
                for (const fileName of Logger.DEBUG_FILE_NAMES) {
                    const exists = await vault.adapter.exists(fileName);
                    if (exists) {
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
     * Check if debug mode is enabled
     */
    /**
     * Check if debug mode is enabled
     * Public method to allow other parts of the codebase to check debug status
     */
    static isDebugEnabled(): boolean {
        // Primary: Check explicit debug mode setting (user-controlled)
        if (Logger.debugMode) {
            return true;
        }

        // Secondary: Check for debug flag file (developer convenience)
        return Logger.debugFileExists;
    }

    /**
     * Log debug information (only shown in debug mode)
     */
    static debug(...args: unknown[]): void {
        if (Logger.isDebugEnabled()) {
            console.debug('[Ideatr Debug]', ...args);
        }
    }

    /**
     * Log informational messages (only shown in debug mode)
     */
    static info(...args: unknown[]): void {
        if (Logger.isDebugEnabled()) {
            console.debug('[Ideatr]', ...args);
        }
    }

    /**
     * Log warnings (only shown in debug mode)
     * For warnings that should always be shown, use console.warn directly
     */
    static warn(...args: unknown[]): void {
        if (Logger.isDebugEnabled()) {
            console.warn('[Ideatr]', ...args);
        }
    }

    /**
     * Log errors (always shown - use console.error directly for critical errors)
     * This is for non-critical errors that can be gated
     */
    static error(...args: unknown[]): void {
        if (Logger.isDebugEnabled()) {
            console.error('[Ideatr]', ...args);
        }
    }

    /**
     * Log with a specific tag/context (only shown in debug mode)
     */
    static log(tag: string, ...args: unknown[]): void {
        if (Logger.isDebugEnabled()) {
            console.debug(`[Ideatr:${tag}]`, ...args);
        }
    }
}

