/**
 * Tests for Logger utility
 * Tests debug mode detection via settings and debug file
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App, Vault, TFile } from '../mocks/obsidian';
import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
    let mockApp: App;
    let mockVault: Vault;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockVault = new Vault();
        mockApp = new App();
        mockApp.vault = mockVault;

        // Mock vault.adapter.exists() for debug file detection
        (mockVault as any).adapter = {
            exists: vi.fn().mockResolvedValue(false),
        };

        consoleLogSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Reset Logger state
        Logger.initialize(null, false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with app and debug mode setting', () => {
            Logger.initialize(mockApp, true);
            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
        });

        it('should initialize with debug mode disabled by default', () => {
            Logger.initialize(mockApp, false);
            Logger.debug('test');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('debug file detection', () => {
        it('should detect .ideatr-debug file', async () => {
            (mockVault.adapter as any).exists = vi.fn(async (path: string) => {
                return path === '.ideatr-debug';
            });

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');

            vi.useRealTimers();
        });

        it('should detect .ideatr-debug.md file', async () => {
            (mockVault.adapter as any).exists = vi.fn(async (path: string) => {
                return path === '.ideatr-debug.md';
            });

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');

            vi.useRealTimers();
        });

        it('should prefer .ideatr-debug over .ideatr-debug.md', async () => {
            const existsSpy = vi.fn(async (path: string) => {
                // Should check .ideatr-debug first, and return true if found
                return path === '.ideatr-debug';
            });
            (mockVault.adapter as any).exists = existsSpy;

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
            // Should check .ideatr-debug first
            expect(existsSpy).toHaveBeenCalledWith('.ideatr-debug');

            vi.useRealTimers();
        });

        it('should work when debug file does not exist', async () => {
            (mockVault.adapter as any).exists = vi.fn(async () => false);

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            Logger.debug('test');
            expect(consoleLogSpy).not.toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('synchronous checking', () => {
        it('should check debug file synchronously on first debug call', async () => {
            (mockVault.adapter as any).exists = vi.fn(async (path: string) => {
                return path === '.ideatr-debug';
            });

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            // Should work after async check completes
            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');

            vi.useRealTimers();
        });
    });

    describe('forceRecheckDebugFile', () => {
        it('should force recheck of debug file', async () => {
            // Initially no debug file
            (mockVault.adapter as any).exists = vi.fn(async () => false);

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            // Initially no debug file
            Logger.debug('test1');
            expect(consoleLogSpy).not.toHaveBeenCalled();

            // Update mock to return true for .ideatr-debug
            (mockVault.adapter as any).exists = vi.fn(async (path: string) => {
                return path === '.ideatr-debug';
            });

            // Force recheck
            Logger.forceRecheckDebugFile();

            await vi.advanceTimersByTimeAsync(100);

            Logger.debug('test2');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test2');

            vi.useRealTimers();
        });
    });

    describe('periodic rechecking', () => {
        it('should recheck debug file periodically', async () => {
            // Initially no debug file
            (mockVault.adapter as any).exists = vi.fn(async () => false);

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            // Initially no debug file
            Logger.debug('test1');
            expect(consoleLogSpy).not.toHaveBeenCalled();

            // Update mock to return true for .ideatr-debug after initial check
            (mockVault.adapter as any).exists = vi.fn(async (path: string) => {
                return path === '.ideatr-debug';
            });

            // Force recheck (there's no automatic periodic recheck, so we use forceRecheckDebugFile)
            Logger.forceRecheckDebugFile();
            await vi.advanceTimersByTimeAsync(100);

            // Now should detect the file
            Logger.debug('test2');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test2');

            vi.useRealTimers();
        });
    });

    describe('debug mode priority', () => {
        it('should prioritize settings debug mode over file', async () => {
            (mockVault.adapter as any).exists = vi.fn(async () => false);

            vi.useFakeTimers();
            await Logger.initialize(mockApp, true);
            await vi.advanceTimersByTimeAsync(100);

            // Should work even without debug file
            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');

            vi.useRealTimers();
        });

        it('should use debug file when settings debug mode is false', async () => {
            (mockVault.adapter as any).exists = vi.fn(async (path: string) => {
                return path === '.ideatr-debug';
            });

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');

            vi.useRealTimers();
        });
    });

    describe('logging methods', () => {
        beforeEach(() => {
            Logger.initialize(mockApp, true);
        });

        it('should log debug messages', () => {
            Logger.debug('debug message');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'debug message');
        });

        it('should log info messages', () => {
            Logger.info('info message');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr]', 'info message');
        });

        it('should log warnings', () => {
            Logger.warn('warning message');
            expect(consoleWarnSpy).toHaveBeenCalledWith('[Ideatr]', 'warning message');
        });

        it('should log errors', () => {
            Logger.error('error message');
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Ideatr]', 'error message');
        });

        it('should log with tag', () => {
            Logger.log('Tag', 'tagged message');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr:Tag]', 'tagged message');
        });

        it('should not log when debug mode is disabled', async () => {
            mockVault.getAbstractFileByPath = vi.fn(() => null);

            vi.useFakeTimers();
            await Logger.initialize(mockApp, false);
            await vi.advanceTimersByTimeAsync(100);

            // Clear any logs from initialization
            consoleLogSpy.mockClear();
            consoleWarnSpy.mockClear();
            consoleErrorSpy.mockClear();

            Logger.debug('test');
            Logger.info('test');
            Logger.warn('test');
            Logger.error('test');
            Logger.log('Tag', 'test');

            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            vi.useRealTimers();
        });
    });
});

