/**
 * Tests for ErrorLogService
 * Tests error logging, retrieval, sanitization, and persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorLogService, ErrorLogEntry, ErrorLogSettings, DEFAULT_ERROR_LOG_SETTINGS } from '../../src/services/ErrorLogService';

describe('ErrorLogService', () => {
    let service: ErrorLogService;

    beforeEach(() => {
        service = new ErrorLogService();
    });

    describe('constructor', () => {
        it('should use default settings when none provided', () => {
            const newService = new ErrorLogService();
            const settings = newService.getSettings();

            expect(settings.enabled).toBe(DEFAULT_ERROR_LOG_SETTINGS.enabled);
            expect(settings.maxEntries).toBe(DEFAULT_ERROR_LOG_SETTINGS.maxEntries);
            expect(settings.retentionDays).toBe(DEFAULT_ERROR_LOG_SETTINGS.retentionDays);
        });

        it('should merge provided settings with defaults', () => {
            const customSettings: Partial<ErrorLogSettings> = {
                enabled: false,
                maxEntries: 100,
            };
            const newService = new ErrorLogService(customSettings);
            const settings = newService.getSettings();

            expect(settings.enabled).toBe(false);
            expect(settings.maxEntries).toBe(100);
            expect(settings.retentionDays).toBe(DEFAULT_ERROR_LOG_SETTINGS.retentionDays);
        });
    });

    describe('logError', () => {
        it('should log error from Error object', () => {
            const error = new Error('Test error');
            error.stack = 'Error: Test error\n    at test.js:1:1';

            service.logError(error);

            const logs = service.getAllLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].error).toBe('Test error');
            expect(logs[0].stack).toBe('Error: Test error\n    at test.js:1:1');
        });

        it('should log error from string', () => {
            service.logError('String error');

            const logs = service.getAllLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].error).toBe('String error');
            expect(logs[0].stack).toBeUndefined();
        });

        it('should include context when provided', () => {
            service.logError('Error', 'classification');

            const logs = service.getAllLogs();
            expect(logs[0].context).toBe('classification');
        });

        it('should include userAction when provided', () => {
            service.logError('Error', 'classification', 'capture-idea');

            const logs = service.getAllLogs();
            expect(logs[0].userAction).toBe('capture-idea');
        });

        it('should include metadata when provided', () => {
            const metadata = { userId: '123', action: 'test' };
            service.logError('Error', 'classification', 'capture-idea', metadata);

            const logs = service.getAllLogs();
            expect(logs[0].metadata).toEqual(metadata);
        });

        it('should not log when service is disabled', () => {
            const disabledService = new ErrorLogService({ enabled: false });
            disabledService.logError('Error');

            const logs = disabledService.getAllLogs();
            expect(logs.length).toBe(0);
        });

        it('should trim logs to maxEntries', () => {
            const limitedService = new ErrorLogService({ maxEntries: 5 });

            for (let i = 0; i < 10; i++) {
                limitedService.logError(`Error ${i}`);
            }

            const logs = limitedService.getAllLogs();
            expect(logs.length).toBe(5);
            // Should keep the most recent entries
            expect(logs[0].error).toBe('Error 5');
            expect(logs[4].error).toBe('Error 9');
        });

        it('should set timestamp for each log entry', () => {
            const before = new Date();
            service.logError('Error');
            const after = new Date();

            const logs = service.getAllLogs();
            expect(logs[0].timestamp).toBeInstanceOf(Date);
            expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('getRecentLogs', () => {
        beforeEach(() => {
            // Create logs with different timestamps
            const now = new Date();
            const oldDate = new Date(now);
            oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

            // Manually add old log (bypassing retention cleanup)
            (service as any).logs.push({
                timestamp: oldDate,
                error: 'Old error',
            });

            // Add recent logs
            service.logError('Recent error 1');
            service.logError('Recent error 2');
        });

        it('should return only logs within retention period', () => {
            const recentLogs = service.getRecentLogs();

            expect(recentLogs.length).toBe(2);
            expect(recentLogs.every(log => log.error.startsWith('Recent'))).toBe(true);
        });

        it('should limit results when limit is provided', () => {
            service.logError('Recent error 3');
            service.logError('Recent error 4');

            const recentLogs = service.getRecentLogs(2);

            expect(recentLogs.length).toBe(2);
        });

        it('should return most recent logs when limit is provided', () => {
            service.logError('Recent error 3');
            service.logError('Recent error 4');

            const recentLogs = service.getRecentLogs(2);

            expect(recentLogs[0].error).toBe('Recent error 3');
            expect(recentLogs[1].error).toBe('Recent error 4');
        });
    });

    describe('getAllLogs', () => {
        it('should return all logs', () => {
            service.logError('Error 1');
            service.logError('Error 2');
            service.logError('Error 3');

            const logs = service.getAllLogs();
            expect(logs.length).toBe(3);
        });

        it('should return a copy of logs array', () => {
            service.logError('Error');
            const logs1 = service.getAllLogs();
            const logs2 = service.getAllLogs();

            expect(logs1).not.toBe(logs2);
            expect(logs1).toEqual(logs2);
        });
    });

    describe('clearLogs', () => {
        it('should clear all logs', () => {
            service.logError('Error 1');
            service.logError('Error 2');

            service.clearLogs();

            const logs = service.getAllLogs();
            expect(logs.length).toBe(0);
        });
    });

    describe('sanitizeLogs', () => {
        it('should sanitize user home paths', () => {
            const error = new Error('Error in /Users/john/project/file.js');
            service.logError(error);

            const logs = service.getAllLogs();
            const sanitized = service.sanitizeLogs(logs);
            const parsed = JSON.parse(sanitized);

            expect(parsed[0].error).toContain('[USER_HOME]');
            expect(parsed[0].error).not.toContain('/Users/john');
        });

        it('should sanitize API keys', () => {
            const error = new Error('API key: sk-123456789012345678901234567890');
            service.logError(error);

            const logs = service.getAllLogs();
            const sanitized = service.sanitizeLogs(logs);
            const parsed = JSON.parse(sanitized);

            expect(parsed[0].error).toContain('[API_KEY_REDACTED]');
            expect(parsed[0].error).not.toContain('sk-123456789012345678901234567890');
        });

        it('should sanitize email addresses', () => {
            const error = new Error('Contact user@example.com for help');
            service.logError(error);

            const logs = service.getAllLogs();
            const sanitized = service.sanitizeLogs(logs);
            const parsed = JSON.parse(sanitized);

            expect(parsed[0].error).toContain('[EMAIL_REDACTED]');
            expect(parsed[0].error).not.toContain('user@example.com');
        });

        it('should sanitize vault paths', () => {
            const error = new Error('File: .obsidian/plugins/ideatr/config.json');
            service.logError(error);

            const logs = service.getAllLogs();
            const sanitized = service.sanitizeLogs(logs);
            const parsed = JSON.parse(sanitized);

            expect(parsed[0].error).toContain('[OBSIDIAN_CONFIG]');
        });

        it('should sanitize metadata', () => {
            const metadata = {
                path: '/Users/john/file.js',
                email: 'user@example.com',
                nested: {
                    key: 'sk-123456789012345678901234567890'
                }
            };
            service.logError('Error', 'context', 'action', metadata);

            const logs = service.getAllLogs();
            const sanitized = service.sanitizeLogs(logs);
            const parsed = JSON.parse(sanitized);

            expect(parsed[0].metadata.path).toContain('[USER_HOME]');
            expect(parsed[0].metadata.email).toBe('[EMAIL_REDACTED]');
            expect(parsed[0].metadata.nested.key).toBe('[API_KEY_REDACTED]');
        });

        it('should return valid JSON', () => {
            service.logError('Error 1');
            service.logError('Error 2');

            const logs = service.getAllLogs();
            const sanitized = service.sanitizeLogs(logs);

            expect(() => JSON.parse(sanitized)).not.toThrow();
            const parsed = JSON.parse(sanitized);
            expect(Array.isArray(parsed)).toBe(true);
        });
    });

    describe('formatLogsForIssue', () => {
        it('should return message when no logs', () => {
            const formatted = service.formatLogsForIssue([]);

            expect(formatted).toBe('No error logs available.');
        });

        it('should format single log entry', () => {
            const error = new Error('Test error');
            service.logError(error, 'classification', 'capture-idea');

            const logs = service.getAllLogs();
            const formatted = service.formatLogsForIssue(logs);

            expect(formatted).toContain('## Error Logs');
            expect(formatted).toContain('Test error');
            expect(formatted).toContain('Context: classification');
            expect(formatted).toContain('Action: capture-idea');
        });

        it('should format multiple log entries', () => {
            service.logError('Error 1', 'context1');
            service.logError('Error 2', 'context2');

            const logs = service.getAllLogs();
            const formatted = service.formatLogsForIssue(logs);

            expect(formatted).toContain('Error 1');
            expect(formatted).toContain('Error 2');
            expect(formatted).toContain('---');
        });

        it('should truncate long stack traces', () => {
            const error = new Error('Test error');
            const longStack = Array(50).fill('    at test.js:1:1').join('\n');
            error.stack = `Error: Test error\n${longStack}`;

            service.logError(error);

            const logs = service.getAllLogs();
            const formatted = service.formatLogsForIssue(logs);

            const stackLines = formatted.split('\n').filter(line => line.includes('at test.js'));
            expect(stackLines.length).toBeLessThanOrEqual(20);
        });

        it('should sanitize sensitive information in formatted output', () => {
            const error = new Error('Error in /Users/john/file.js');
            service.logError(error);

            const logs = service.getAllLogs();
            const formatted = service.formatLogsForIssue(logs);

            expect(formatted).toContain('[USER_HOME]');
            expect(formatted).not.toContain('/Users/john');
        });
    });

    describe('updateSettings', () => {
        it('should update settings', () => {
            service.updateSettings({ maxEntries: 100 });

            const settings = service.getSettings();
            expect(settings.maxEntries).toBe(100);
        });

        it('should merge settings with existing', () => {
            service.updateSettings({ maxEntries: 100 });
            service.updateSettings({ retentionDays: 14 });

            const settings = service.getSettings();
            expect(settings.maxEntries).toBe(100);
            expect(settings.retentionDays).toBe(14);
        });

        it('should clean old entries when settings updated', () => {
            // Add old log
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);
            (service as any).logs.push({
                timestamp: oldDate,
                error: 'Old error',
            });

            service.updateSettings({ retentionDays: 5 });

            const logs = service.getAllLogs();
            expect(logs.length).toBe(0);
        });
    });

    describe('getSettings', () => {
        it('should return a copy of settings', () => {
            const settings1 = service.getSettings();
            const settings2 = service.getSettings();

            expect(settings1).not.toBe(settings2);
            expect(settings1).toEqual(settings2);
        });
    });

    describe('cleanOldEntries', () => {
        it('should remove entries older than retention period', () => {
            const shortRetentionService = new ErrorLogService({ retentionDays: 1 });

            // Add old log
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 2);
            (shortRetentionService as any).logs.push({
                timestamp: oldDate,
                error: 'Old error',
            });

            // Add recent log
            shortRetentionService.logError('Recent error');

            const logs = shortRetentionService.getAllLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].error).toBe('Recent error');
        });
    });
});

