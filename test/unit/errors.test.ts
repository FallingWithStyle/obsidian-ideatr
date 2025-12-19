/**
 * Tests for errors.ts
 * Tests custom error classes
 */

import { describe, it, expect } from 'vitest';
import { UserFacingError, ServiceUnavailableError, NoActiveFileError } from '../../src/utils/errors';

describe('errors', () => {
    describe('UserFacingError', () => {
        it('should create error with message and user message', () => {
            const error = new UserFacingError('Internal error', 'User-friendly message');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(UserFacingError);
            expect(error.message).toBe('Internal error');
            expect(error.userMessage).toBe('User-friendly message');
            expect(error.name).toBe('UserFacingError');
        });

        it('should be catchable as Error', () => {
            const error = new UserFacingError('Internal', 'User');

            expect(error instanceof Error).toBe(true);
        });
    });

    describe('ServiceUnavailableError', () => {
        it('should create error with service name', () => {
            const error = new ServiceUnavailableError('TestService');

            expect(error).toBeInstanceOf(UserFacingError);
            expect(error.message).toContain('TestService');
            expect(error.userMessage).toContain('TestService');
            expect(error.name).toBe('ServiceUnavailableError');
        });

        it('should include service name in user message', () => {
            const error = new ServiceUnavailableError('LLMService');

            expect(error.userMessage).toContain('LLMService');
            expect(error.userMessage).toContain('configured');
        });
    });

    describe('NoActiveFileError', () => {
        it('should create error with appropriate message', () => {
            const error = new NoActiveFileError();

            expect(error).toBeInstanceOf(UserFacingError);
            expect(error.message).toBe('No active file');
            expect(error.userMessage).toContain('active note');
            expect(error.name).toBe('NoActiveFileError');
        });

        it('should provide user-friendly message', () => {
            const error = new NoActiveFileError();

            expect(error.userMessage).toContain('open an idea file');
        });
    });
});

