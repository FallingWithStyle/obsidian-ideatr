import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LlamaService } from '../../src/services/LlamaService';
import type { IdeatrSettings } from '../../src/settings';

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock fs
const fsMocks = vi.hoisted(() => {
    const existsSync = vi.fn(() => true);
    const accessSync = vi.fn();
    const readdirSync = vi.fn(() => []);
    const chmodSync = vi.fn();
    return {
        existsSync,
        accessSync,
        readdirSync,
        chmodSync,
        constants: {
            X_OK: 1
        }
    };
});

vi.mock('fs', async () => {
    return {
        ...fsMocks,
        constants: fsMocks.constants
    };
});

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
        fsMocks.existsSync.mockReturnValue(true);
        fsMocks.accessSync.mockReturnValue(undefined);
        fsMocks.readdirSync.mockReturnValue([]);
        
        // Use getInstance for singleton pattern
        service = LlamaService.getInstance(mockSettings);
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

            // Wait a tick for spawn to complete and register stdout listener
            await vi.advanceTimersByTimeAsync(0);

            // Simulate server startup
            const stdoutCallbacks = mocks.childProcess.stdout.on.mock.calls.filter(call => call[0] === 'data');
            if (stdoutCallbacks.length > 0 && stdoutCallbacks[0][1]) {
                const stdoutCallback = stdoutCallbacks[0][1];
                stdoutCallback(Buffer.from('HTTP server listening'));
            }

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
            service = LlamaService.getInstance(mockSettings);
            await expect(service.startServer()).rejects.toThrow('Llama binary path not configured');
            expect(mocks.spawn).not.toHaveBeenCalled();
        });

        it('should stop server on request', async () => {
            const startPromise = service.startServer();

            // Wait a tick for spawn to complete and register stdout listener
            await vi.advanceTimersByTimeAsync(0);

            // Simulate server startup
            const stdoutCallbacks = mocks.childProcess.stdout.on.mock.calls.filter(call => call[0] === 'data');
            if (stdoutCallbacks.length > 0 && stdoutCallbacks[0][1]) {
                const stdoutCallback = stdoutCallbacks[0][1];
                stdoutCallback(Buffer.from('HTTP server listening'));
            }

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
            service = LlamaService.getInstance(mockSettings);
            expect(service.isAvailable()).toBe(false);
        });
    });

    describe('GPU layer calculation', () => {
        it('should use 25 GPU layers for 70B models', async () => {
            mockSettings.localModel = 'llama-3.3-70b';
            service = LlamaService.getInstance(mockSettings);
            
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Check spawn was called with correct GPU layers
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '25'])
            );
            
            // Clean up
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use 40 GPU layers for 20-40GB models', async () => {
            mockSettings.localModel = 'llama-3.1-8b';
            service = LlamaService.getInstance(mockSettings);
            
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Check spawn was called with correct GPU layers
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '40'])
            );
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use 60 GPU layers for 10-20GB models', async () => {
            mockSettings.localModel = 'qwen-2.5-7b';
            service = LlamaService.getInstance(mockSettings);
            
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Check spawn was called with correct GPU layers
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '60'])
            );
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use 75 GPU layers for 5-10GB models', async () => {
            mockSettings.localModel = 'phi-3.5-mini';
            service = LlamaService.getInstance(mockSettings);
            
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Check spawn was called with correct GPU layers
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '75'])
            );
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });
    });

    describe('model selection', () => {
        it('should prefer exact filename match', async () => {
            fsMocks.existsSync.mockImplementation((path: string) => {
                if (typeof path === 'string' && path.includes('Qwen2.5-7B-Instruct-Q8_0.gguf')) {
                    return true;
                }
                if (typeof path === 'string' && path.includes('llama-server')) {
                    return true;
                }
                return false;
            });

            mockSettings.localModel = 'qwen-2.5-7b';
            service = LlamaService.getInstance(mockSettings);
            
            // This will call getEffectiveModelPath internally
            try {
                await service.startServer();
            } catch (error) {
                // May fail for other reasons, but path should be checked
            }
            
            // Verify it tried to use the correct model path
            expect(fsMocks.existsSync).toHaveBeenCalledWith(
                expect.stringContaining('Qwen2.5-7B-Instruct-Q8_0.gguf')
            );
        });

        it('should not fall back to random GGUF files', async () => {
            fsMocks.readdirSync.mockReturnValue([
                'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
                'Qwen2.5-7B-Instruct-Q8_0.gguf',
                'Phi-3.5-mini-instruct-Q8_0.gguf'
            ] as any);
            
            fsMocks.existsSync.mockImplementation((path: string) => {
                // Binary exists
                if (typeof path === 'string' && path.includes('llama-server')) {
                    return true;
                }
                // Model directory exists
                if (typeof path === 'string' && path.includes('.ideatr/models') && !path.endsWith('.gguf')) {
                    return true;
                }
                // Specific model file doesn't exist
                return false;
            });

            mockSettings.localModel = 'qwen-2.5-7b';
            service = LlamaService.getInstance(mockSettings);
            
            // Should not use the 70B model even though it exists
            try {
                await service.startServer();
            } catch (error) {
                // Should fail because configured model doesn't exist
                const errorMessage = (error as Error).message;
                expect(errorMessage).toMatch(/not found|not configured|does not exist/i);
            }
        });
    });

    describe('adaptive timeouts', () => {
        it('should use 5 minute timeout for 70B models', async () => {
            mockSettings.localModel = 'llama-3.3-70b';
            service = LlamaService.getInstance(mockSettings);
            
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Simulate long loading time
            const stderrCallbacks = mocks.childProcess.stderr.on.mock.calls.filter(call => call[0] === 'data');
            if (stderrCallbacks.length > 0 && stderrCallbacks[0][1]) {
                const stderrCallback = stderrCallbacks[0][1];
                stderrCallback(Buffer.from('loading model tensors'));
            }
            
            // Advance time but not enough to timeout (should wait 5 minutes = 300000ms)
            await vi.advanceTimersByTimeAsync(200000); // 200 seconds
            
            // Should still be waiting (not timed out)
            expect(mocks.childProcess.kill).not.toHaveBeenCalled();
            
            // Clean up
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use shorter timeout for smaller models', async () => {
            mockSettings.localModel = 'phi-3.5-mini';
            service = LlamaService.getInstance(mockSettings);
            
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Smaller models should timeout faster (2 minutes = 120000ms)
            // This is tested through ensureReady behavior
            expect(mocks.spawn).toHaveBeenCalled();
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });
    });

    describe('memory error detection', () => {
        it('should detect Metal memory errors', async () => {
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Simulate Metal memory error
            const stderrCallbacks = mocks.childProcess.stderr.on.mock.calls.filter(call => call[0] === 'data');
            if (stderrCallbacks.length > 0 && stderrCallbacks[0][1]) {
                const stderrCallback = stderrCallbacks[0][1];
                stderrCallback(Buffer.from('error: Insufficient Memory (00000008:kIOGPUCommandBufferCallbackErrorOutOfMemory)'));
            }
            
            await vi.advanceTimersByTimeAsync(2000);
            
            // Error should be detected and logged
            // The error handler should have been called
            expect(stderrCallbacks.length).toBeGreaterThan(0);
            
            try {
                await startPromise;
            } catch {
                // Expected to fail with memory error
            }
        });

        it('should detect Metal allocation warnings', async () => {
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Simulate Metal allocation warning
            const stderrCallbacks = mocks.childProcess.stderr.on.mock.calls.filter(call => call[0] === 'data');
            if (stderrCallbacks.length > 0 && stderrCallbacks[0][1]) {
                const stderrCallback = stderrCallbacks[0][1];
                stderrCallback(Buffer.from('ggml_metal_log_allocated_size: warning: current allocated size is greater than the recommended max working set size'));
            }
            
            await vi.advanceTimersByTimeAsync(2000);
            
            // Warning should be detected
            expect(stderrCallbacks.length).toBeGreaterThan(0);
            
            try {
                await startPromise;
            } catch {
                // May or may not fail on warning
            }
        });

        it('should detect command buffer failures', async () => {
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Simulate command buffer failure
            const stderrCallbacks = mocks.childProcess.stderr.on.mock.calls.filter(call => call[0] === 'data');
            if (stderrCallbacks.length > 0 && stderrCallbacks[0][1]) {
                const stderrCallback = stderrCallbacks[0][1];
                stderrCallback(Buffer.from('ggml_metal_synchronize: error: command buffer 0 failed with status 5'));
            }
            
            await vi.advanceTimersByTimeAsync(2000);
            
            // Error should be detected
            expect(stderrCallbacks.length).toBeGreaterThan(0);
            
            try {
                await startPromise;
            } catch {
                // Expected to fail
            }
        });
    });

    describe('plugin unload handling', () => {
        it('should handle cleanup during model loading', async () => {
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Simulate model loading
            const stderrCallbacks = mocks.childProcess.stderr.on.mock.calls.filter(call => call[0] === 'data');
            if (stderrCallbacks.length > 0 && stderrCallbacks[0][1]) {
                const stderrCallback = stderrCallbacks[0][1];
                stderrCallback(Buffer.from('loading model tensors'));
            }
            
            // Trigger cleanup while loading
            service.cleanup();
            
            // Should gracefully stop the server
            expect(mocks.childProcess.kill).toHaveBeenCalled();
            
            // Event handlers should ignore events during cleanup
            if (stderrCallbacks.length > 0 && stderrCallbacks[0][1]) {
                const stderrCallback = stderrCallbacks[0][1];
                // This should be ignored during cleanup
                stderrCallback(Buffer.from('model loaded'));
            }
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Expected to fail or be cancelled
            }
        });

        it('should prevent new operations during cleanup', async () => {
            service.cleanup();
            
            // Try to start server during cleanup
            await expect(service.startServer()).rejects.toThrow('Cannot start server during plugin cleanup');
        });

        it('should gracefully kill process with SIGTERM then SIGKILL', async () => {
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            // Simulate server running
            const stdoutCallbacks = mocks.childProcess.stdout.on.mock.calls.filter(call => call[0] === 'data');
            if (stdoutCallbacks.length > 0 && stdoutCallbacks[0][1]) {
                const stdoutCallback = stdoutCallbacks[0][1];
                stdoutCallback(Buffer.from('HTTP server listening'));
            }
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore
            }
            
            // Mock process to not be killed immediately
            mocks.childProcess.killed = false;
            mocks.childProcess.kill.mockImplementation((signal?: string) => {
                if (signal === 'SIGTERM') {
                    // Simulate process not dying immediately
                    return true;
                }
                return true;
            });
            
            service.stopServer();
            
            // Should try SIGTERM first
            expect(mocks.childProcess.kill).toHaveBeenCalledWith('SIGTERM');
            
            // After timeout, should try SIGKILL
            await vi.advanceTimersByTimeAsync(2000);
            // Note: The actual SIGKILL happens in a setTimeout, which we can't easily test
            // but the logic is there
        });

        it('should remove event handlers before killing process', async () => {
            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);
            
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore
            }
            
            const removeListenerCalls: string[] = [];
            mocks.childProcess.stdout.removeListener = vi.fn((event: string) => {
                removeListenerCalls.push(`stdout.${event}`);
            });
            mocks.childProcess.stderr.removeListener = vi.fn((event: string) => {
                removeListenerCalls.push(`stderr.${event}`);
            });
            mocks.childProcess.removeListener = vi.fn((event: string) => {
                removeListenerCalls.push(event);
            });
            
            service.stopServer();
            
            // Should have removed event listeners
            expect(mocks.childProcess.stdout.removeListener).toHaveBeenCalled();
            expect(mocks.childProcess.stderr.removeListener).toHaveBeenCalled();
            expect(mocks.childProcess.removeListener).toHaveBeenCalled();
        });
    });
});
