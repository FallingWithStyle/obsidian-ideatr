/**
 * ErrorLogService - Collects and manages error logs for bug reports
 */

export interface ErrorLogEntry {
    timestamp: Date;
    error: string;
    stack?: string;
    context?: string; // e.g., "classification", "domain-check", "capture"
    userAction?: string; // e.g., "capture-idea", "classify-idea"
    metadata?: Record<string, unknown>; // Additional context
}

export interface ErrorLogSettings {
    enabled: boolean;
    maxEntries: number;
    retentionDays: number;
}

export const DEFAULT_ERROR_LOG_SETTINGS: ErrorLogSettings = {
    enabled: true,
    maxEntries: 50,
    retentionDays: 7
};

/**
 * Service for collecting, managing, and sanitizing error logs
 */
export class ErrorLogService {
    private logs: ErrorLogEntry[] = [];
    private settings: ErrorLogSettings;

    constructor(settings?: Partial<ErrorLogSettings>) {
        this.settings = { ...DEFAULT_ERROR_LOG_SETTINGS, ...settings };
    }

    /**
     * Log an error entry
     */
    logError(
        error: Error | string,
        context?: string,
        userAction?: string,
        metadata?: Record<string, unknown>
    ): void {
        if (!this.settings.enabled) {
            return;
        }

        const errorMessage = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;

        const entry: ErrorLogEntry = {
            timestamp: new Date(),
            error: errorMessage,
            stack,
            context,
            userAction,
            metadata
        };

        this.logs.push(entry);

        // Trim to max entries
        if (this.logs.length > this.settings.maxEntries) {
            this.logs = this.logs.slice(-this.settings.maxEntries);
        }

        // Remove old entries beyond retention period
        this.cleanOldEntries();
    }

    /**
     * Get recent error logs
     */
    getRecentLogs(limit?: number): ErrorLogEntry[] {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

        const recentLogs = this.logs.filter(log => log.timestamp >= cutoffDate);

        if (limit) {
            return recentLogs.slice(-limit);
        }

        return recentLogs;
    }

    /**
     * Get all error logs
     */
    getAllLogs(): ErrorLogEntry[] {
        return [...this.logs];
    }

    /**
     * Clear all error logs
     */
    clearLogs(): void {
        this.logs = [];
    }

    /**
     * Sanitize error logs for submission
     */
    sanitizeLogs(logs: ErrorLogEntry[]): string {
        const sanitized = logs.map(log => {
            let sanitizedError = this.sanitizeString(log.error);
            let sanitizedStack = log.stack ? this.sanitizeString(log.stack) : undefined;
            let sanitizedMetadata = log.metadata ? this.sanitizeMetadata(log.metadata) : undefined;

            return {
                ...log,
                error: sanitizedError,
                stack: sanitizedStack,
                metadata: sanitizedMetadata
            };
        });

        return JSON.stringify(sanitized, null, 2);
    }

    /**
     * Format error logs as markdown for GitHub issue
     */
    formatLogsForIssue(logs: ErrorLogEntry[]): string {
        if (logs.length === 0) {
            return 'No error logs available.';
        }

        const entries = logs.map(log => {
            let sanitizedError = this.sanitizeString(log.error);
            let sanitizedStack = log.stack ? this.sanitizeString(log.stack) : undefined;

            let entry = `**${log.timestamp.toISOString()}**`;
            if (log.context) {
                entry += ` - Context: ${this.sanitizeString(log.context)}`;
            }
            if (log.userAction) {
                entry += ` - Action: ${this.sanitizeString(log.userAction)}`;
            }
            entry += `\n\`\`\`\n${sanitizedError}\n\`\`\``;

            if (sanitizedStack) {
                // Truncate stack trace to last 20 lines
                const stackLines = sanitizedStack.split('\n');
                const truncatedStack = stackLines.slice(-20).join('\n');
                entry += `\n\nStack trace (last 20 lines):\n\`\`\`\n${truncatedStack}\n\`\`\``;
            }

            return entry;
        }).join('\n\n---\n\n');

        return `## Error Logs\n\n${entries}`;
    }

    /**
     * Sanitize a string to remove sensitive information
     */
    private sanitizeString(str: string): string {
        // Remove file paths (replace with placeholders)
        str = str.replace(new RegExp('/Users/[^/]+', 'g'), '[USER_HOME]');
        str = str.replace(new RegExp('/home/[^/]+', 'g'), '[USER_HOME]');
        str = str.replace(/C:\\Users\\[^\\]+/gi, '[USER_HOME]');
        str = str.replace(/[A-Z]:\\[^:]+/g, '[DRIVE_PATH]');
        
        // Remove API keys (common patterns)
        str = str.replace(/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY_REDACTED]');
        str = str.replace(/[a-zA-Z0-9]{32,}/g, (match) => {
            // Check if it looks like an API key (long alphanumeric string)
            if (match.length > 40) {
                return '[API_KEY_REDACTED]';
            }
            return match;
        });

        // Remove email addresses
        str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

        // Remove vault paths (configDir can vary, so match common patterns)
        str = str.replace(/\.obsidian[^"'\s]*/g, '[OBSIDIAN_CONFIG]');
        // Also match any config directory pattern
        str = str.replace(/[^"'\s]*\/plugins\/[^"'\s]*/g, '[PLUGIN_PATH]');
        str = str.replace(/Ideas\/[^"'\s]*/g, '[IDEA_FILE]');
        str = str.replace(/Projects\/[^"'\s]*/g, '[PROJECT_FILE]');

        return str;
    }

    /**
     * Sanitize metadata object
     */
    private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
        const sanitized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Clean old entries beyond retention period
     */
    private cleanOldEntries(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

        this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    }

    /**
     * Update settings
     */
    updateSettings(settings: Partial<ErrorLogSettings>): void {
        this.settings = { ...this.settings, ...settings };
        this.cleanOldEntries();
    }

    /**
     * Get current settings
     */
    getSettings(): ErrorLogSettings {
        return { ...this.settings };
    }
}

