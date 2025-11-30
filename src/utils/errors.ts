/**
 * Error handling utilities for commands
 */

/**
 * Base error class for user-facing errors
 */
export class UserFacingError extends Error {
    public readonly userMessage: string;

    constructor(message: string, userMessage: string) {
        super(message);
        this.name = 'UserFacingError';
        this.userMessage = userMessage;
    }
}

/**
 * Error when a service is not available
 */
export class ServiceUnavailableError extends UserFacingError {
    constructor(serviceName: string) {
        super(
            `Service ${serviceName} is not available`,
            `${serviceName} is not configured. Please set it up in settings.`
        );
        this.name = 'ServiceUnavailableError';
    }
}

/**
 * Error when no active file is available
 */
export class NoActiveFileError extends UserFacingError {
    constructor() {
        super(
            'No active file',
            'No active note. Please open an idea file.'
        );
        this.name = 'NoActiveFileError';
    }
}

