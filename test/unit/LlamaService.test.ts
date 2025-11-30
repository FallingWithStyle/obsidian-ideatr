import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LlamaService } from '../../src/services/LlamaService';
import type { IdeatrSettings } from '../../src/settings';

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock child_process
const mocks = vi.hoisted(() => {
    const mockSpawn = vi.fn();
    const createMockChildProcess = () => ({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
    });
    const mockChildProcess = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChildProcess);
    return {
        spawn: mockSpawn,
        childProcess: mockChildProcess,
        createMockChildProcess
    };
});

vi.mock('child_process', async () => {
    return {
        spawn: mocks.spawn,
        ChildProcess: class { }
    };
});


// Mock Obsidian Notice
vi.mock('obsidian', () => ({
    Notice: class {
        constructor(message: string) { }
    }
}));

describe('LlamaService', () => {
    let service: LlamaService;
    let mockSettings: IdeatrSettings;
    let unhandledRejections: Error[] = [];

    beforeEach(() => {
        vi.useFakeTimers();
        unhandledRejections = [];
        // Catch unhandled promise rejections to prevent test output noise
        process.on('unhandledRejection', (error) => {
            unhandledRejections.push(error as Error);
        });
        mockSettings = {
            llmProvider: 'llama',
            llamaServerUrl: 'http://localhost:8080',
            llamaBinaryPath: '/path/to/server',
            modelPath: '/path/to/model.gguf',
            llamaServerPort: 8080,
            concurrency: 1,
            llmTimeout: 1000,
            autoClassify: true
        };
        // Reset mocks before creating new service
        mocks.spawn.mockClear();
        mocks.childProcess.stdout.on.mockClear();
        mocks.childProcess.stderr.on.mockClear();
        mocks.childProcess.on.mockClear();
        mocks.childProcess.kill.mockClear();
        service = new LlamaService(mockSettings);
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        // Remove unhandled rejection listener
        process.removeAllListeners('unhandledRejection');
        // Clear any unhandled rejections
        unhandledRejections = [];
    });

    describe('lifecycle', () => {
        it('should start server if configured', async () => {
            const startPromise = service.startServer();

            // Simulate server startup
            const stdoutCallback = mocks.childProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
            stdoutCallback(Buffer.from('HTTP server listening'));

            // Advance timer to get past the startup delay
            await vi.advanceTimersByTimeAsync(2000);
            await startPromise;

            expect(mocks.spawn).toHaveBeenCalledWith(
                '/path/to/server',
                expect.arrayContaining(['-m', '/path/to/model.gguf'])
            );
        });

        it('should not start server if paths missing', async () => {
            mockSettings.llamaBinaryPath = '';
            service = new LlamaService(mockSettings);
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(2000);
            await startPromise;
            expect(mocks.spawn).not.toHaveBeenCalled();
        });

        it('should stop server on request', async () => {
            const startPromise = service.startServer();
            const stdoutCallback = mocks.childProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
            stdoutCallback(Buffer.from('HTTP server listening'));

            await vi.advanceTimersByTimeAsync(2000);
            await startPromise;

            service.stopServer();
            expect(mocks.childProcess.kill).toHaveBeenCalled();
        });
    });

    describe('classify', () => {
        beforeEach(async () => {
            // Ensure server is "ready" for classification tests
            // Start server and simulate readiness
            const startPromise = service.startServer();
            
            // Wait a tick for spawn to complete and register stdout listener
            await vi.advanceTimersByTimeAsync(0);
            
            // Get the stdout callback and trigger it to set isServerReady
            const stdoutCallbacks = mocks.childProcess.stdout.on.mock.calls.filter(call => call[0] === 'data');
            if (stdoutCallbacks.length > 0 && stdoutCallbacks[0][1]) {
                const stdoutCallback = stdoutCallbacks[0][1];
                // Trigger the callback synchronously to set isServerReady flag
                stdoutCallback(Buffer.from('HTTP server listening'));
            }

            // Advance timers to complete startup delay (2000ms)
            await vi.advanceTimersByTimeAsync(2000);
            await startPromise;
        });
        
        it('should successfully classify an idea', async () => {
            const mockResponse = {
                content: JSON.stringify({
                    category: 'game',
                    tags: ['rpg', 'fantasy']
                })
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const classifyPromise = service.classify('A fantasy RPG game');
            
            // Advance timers through any readiness wait loops (up to 5s = 50 * 100ms)
            await vi.advanceTimersByTimeAsync(6000);
            
            const result = await classifyPromise;

            expect(result.category).toBe('game');
            expect(result.tags).toEqual(['rpg', 'fantasy']);
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8080/completion',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        it('should handle timeout', async () => {
            // Mock fetch to respect abort signal and never resolve
            let abortHandler: (() => void) | null = null;
            mockFetch.mockImplementation((url, options) => {
                return new Promise((resolve, reject) => {
                    const signal = options?.signal;
                    if (signal) {
                        // Set up abort listener
                        abortHandler = () => {
                            const error = new Error('The operation was aborted.');
                            error.name = 'AbortError';
                            reject(error);
                        };
                        signal.addEventListener('abort', abortHandler);
                    }
                    // Never resolve - let timeout trigger
                });
            });

            // Start classification
            const classifyPromise = service.classify('test');
            
            // Advance through readiness wait (if any) + timeout (1000ms)
            await vi.advanceTimersByTimeAsync(7000);
            
            // The timeout should have triggered the abort
            // Catch the error to prevent unhandled rejection
            await expect(classifyPromise).rejects.toThrow('API request timed out');
            
            // Wait a tick to ensure any unhandled rejections are caught
            await vi.advanceTimersByTimeAsync(0);
        });

        it('should handle server error', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            const classifyPromise = service.classify('test');
            // Advance through readiness wait
            await vi.advanceTimersByTimeAsync(6000);
            
            // Catch the error to prevent unhandled rejection
            await expect(classifyPromise).rejects.toThrow('Llama.cpp server error: 500 Internal Server Error');
            
            // Wait a tick to ensure any unhandled rejections are caught
            await vi.advanceTimersByTimeAsync(0);
        });

        it('should handle malformed JSON response', async () => {
            const mockResponse = {
                content: 'Not JSON'
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const classifyPromise = service.classify('test');
            // Advance through readiness wait
            await vi.advanceTimersByTimeAsync(6000);
            
            const result = await classifyPromise;
            expect(result.category).toBe('');
            expect(result.tags).toEqual([]);
        });

        it('should use default category if parsing fails', async () => {
            const mockResponse = {
                content: JSON.stringify({
                    invalid: 'data'
                })
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const classifyPromise = service.classify('test');
            // Advance through readiness wait
            await vi.advanceTimersByTimeAsync(6000);
            
            const result = await classifyPromise;
            expect(result.category).toBe('');
            expect(result.tags).toEqual([]);
        });
    });

    describe('isAvailable', () => {
        it('should return true when provider is llama', () => {
            expect(service.isAvailable()).toBe(true);
        });

        it('should return false when provider is none', () => {
            mockSettings.llmProvider = 'none';
            service = new LlamaService(mockSettings);
            expect(service.isAvailable()).toBe(false);
        });
    });
});
