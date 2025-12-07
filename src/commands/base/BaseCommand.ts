import { Notice } from 'obsidian';
import { CommandContext } from './CommandContext';
import { UserFacingError } from '../../utils/errors';
import { Logger } from '../../utils/logger';

/**
 * Abstract base class for all commands
 * Provides common error handling and utility methods
 */
export abstract class BaseCommand {
    constructor(protected readonly context: CommandContext) { }

    /**
     * Execute the command
     */
    abstract execute(): Promise<void>;

    /**
     * Handle errors consistently across all commands
     */
    protected handleError(error: unknown, context?: string, userAction?: string): void {
        Logger.error(`Failed to ${context ?? 'execute command'}:`, error);

        if (this.context.errorLogService) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.context.errorLogService.logError(errorObj, context, userAction);
        }

        if (error instanceof UserFacingError) {
            new Notice(error.userMessage);
        } else {
            const message = context
                ? `Failed to ${context}. Please try again or check console for details.`
                : 'Failed to execute command. Please try again or check console for details.';
            new Notice(message);
        }
    }

    /**
     * Show a notice to the user
     */
    protected showNotice(message: string): void {
        new Notice(message);
    }

    /**
     * Log debug message
     */
    protected debug(message: string, ...args: unknown[]): void {
        Logger.debug(message, ...args);
    }

    /**
     * Log info message
     */
    protected info(message: string, ...args: unknown[]): void {
        Logger.info(message, ...args);
    }

    /**
     * Log warning message
     */
    protected warn(message: string, ...args: unknown[]): void {
        Logger.warn(message, ...args);
    }
}

