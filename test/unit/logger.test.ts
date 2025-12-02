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
        
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
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
        it('should detect .ideatr-debug file', () => {
            const debugFile = new TFile();
            debugFile.path = '.ideatr-debug';
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                if (path === '.ideatr-debug') return debugFile;
                return null;
            });

            Logger.initialize(mockApp, false);
            
            // Wait a bit for async check, then test
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    Logger.debug('test');
                    expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
                    resolve();
                }, 100);
            });
        });

        it('should detect .ideatr-debug.md file', () => {
            const debugFile = new TFile();
            debugFile.path = '.ideatr-debug.md';
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                if (path === '.ideatr-debug.md') return debugFile;
                return null;
            });

            Logger.initialize(mockApp, false);
            
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    Logger.debug('test');
                    expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
                    resolve();
                }, 100);
            });
        });

        it('should prefer .ideatr-debug over .ideatr-debug.md', () => {
            const debugFile1 = new TFile();
            debugFile1.path = '.ideatr-debug';
            const debugFile2 = new TFile();
            debugFile2.path = '.ideatr-debug.md';
            
            let callCount = 0;
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                callCount++;
                if (path === '.ideatr-debug') return debugFile1;
                if (path === '.ideatr-debug.md') return debugFile2;
                return null;
            });

            Logger.initialize(mockApp, false);
            
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    Logger.debug('test');
                    expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
                    // Should check .ideatr-debug first
                    expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('.ideatr-debug');
                    resolve();
                }, 100);
            });
        });

        it('should work when debug file does not exist', () => {
            mockVault.getAbstractFileByPath = vi.fn(() => null);

            Logger.initialize(mockApp, false);
            
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    Logger.debug('test');
                    expect(consoleLogSpy).not.toHaveBeenCalled();
                    resolve();
                }, 100);
            });
        });
    });

    describe('synchronous checking', () => {
        it('should check debug file synchronously on first debug call', () => {
            const debugFile = new TFile();
            debugFile.path = '.ideatr-debug';
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                if (path === '.ideatr-debug') return debugFile;
                return null;
            });

            Logger.initialize(mockApp, false);
            
            // Should work immediately without waiting
            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
        });
    });

    describe('forceRecheckDebugFile', () => {
        it('should force recheck of debug file', () => {
            mockVault.getAbstractFileByPath = vi.fn(() => null);

            Logger.initialize(mockApp, false);
            
            // Initially no debug file
            Logger.debug('test1');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            
            // Create debug file
            const debugFile = new TFile();
            debugFile.path = '.ideatr-debug';
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                if (path === '.ideatr-debug') return debugFile;
                return null;
            });
            
            // Force recheck
            Logger.forceRecheckDebugFile();
            
            // Should now detect the file
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    Logger.debug('test2');
                    expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test2');
                    resolve();
                }, 100);
            });
        });
    });

    describe('periodic rechecking', () => {
        it('should recheck debug file periodically', async () => {
            mockVault.getAbstractFileByPath = vi.fn(() => null);

            Logger.initialize(mockApp, false);
            
            // Initially no debug file
            Logger.debug('test1');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            
            // Create debug file after initial check
            const debugFile = new TFile();
            debugFile.path = '.ideatr-debug';
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                if (path === '.ideatr-debug') return debugFile;
                return null;
            });
            
            // Wait for recheck interval (5 seconds) - but we'll mock time
            vi.useFakeTimers();
            
            // Fast forward past recheck interval
            vi.advanceTimersByTime(6000);
            
            // Now should detect the file
            Logger.debug('test2');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test2');
            
            vi.useRealTimers();
        });
    });

    describe('debug mode priority', () => {
        it('should prioritize settings debug mode over file', () => {
            mockVault.getAbstractFileByPath = vi.fn(() => null);

            Logger.initialize(mockApp, true);
            
            // Should work even without debug file
            Logger.debug('test');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
        });

        it('should use debug file when settings debug mode is false', () => {
            const debugFile = new TFile();
            debugFile.path = '.ideatr-debug';
            mockVault.getAbstractFileByPath = vi.fn((path: string) => {
                if (path === '.ideatr-debug') return debugFile;
                return null;
            });

            Logger.initialize(mockApp, false);
            
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    Logger.debug('test');
                    expect(consoleLogSpy).toHaveBeenCalledWith('[Ideatr Debug]', 'test');
                    resolve();
                }, 100);
            });
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

        it('should not log when debug mode is disabled', () => {
            Logger.initialize(mockApp, false);
            mockVault.getAbstractFileByPath = vi.fn(() => null);

            Logger.debug('test');
            Logger.info('test');
            Logger.warn('test');
            Logger.error('test');
            Logger.log('Tag', 'test');

            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });
});

