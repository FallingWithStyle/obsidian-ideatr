import { Notice } from 'obsidian';
import { UserFacingError } from './errors';
import { ClassificationError, NetworkError, APITimeoutError } from '../types/classification';

/**
 * Standardized error handling for commands
 */
export class CommandErrorHandler {
    /**
     * Handle command errors with consistent user messaging
     */
    static handleError(
        error: unknown,
        context: string,
        errorLogService?: { logError: (error: Error, context?: string, userAction?: string) => void },
        userAction?: string
    ): void {
        console.error(`Failed to ${context}:`, error);

        if (errorLogService) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            errorLogService.logError(errorObj, context, userAction);
        }

        if (error instanceof UserFacingError) {
            new Notice(error.userMessage);
        } else if (error instanceof NetworkError || error instanceof ClassificationError) {
            const cause = error.cause;
            if (cause && (cause.message.includes('CONNECTION_REFUSED') || 
                         cause.message.includes('Failed to fetch'))) {
                new Notice('Language model service is not running. Please start your local language model server or configure a cloud provider.');
            } else if (error instanceof APITimeoutError) {
                new Notice('Language model request timed out. Please try again.');
            } else if (error instanceof NetworkError) {
                new Notice('Network error connecting to language model service. Please check your connection and try again.');
            } else {
                new Notice(`Failed to ${context}. Please check that your language model service is running.`);
            }
        } else if (error instanceof Error) {
            if (error.message.includes('CONNECTION_REFUSED') || 
                error.message.includes('Failed to fetch') ||
                error.name === 'TypeError') {
                new Notice('Language model service is not running. Please start your local language model server or configure a cloud provider.');
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                new Notice('Language model request timed out. Please try again.');
            } else {
                new Notice(`Failed to ${context}: ${error.message}`);
            }
        } else {
            new Notice(`Failed to ${context}. Please try again or check console for details.`);
        }
    }
}

