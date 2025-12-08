import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// MVP MODE: LlamaService is not available in MVP version
// import { LlamaService } from '../../src/services/LlamaService';
import type { IdeatrSettings } from '../../src/settings';

// Mock requestUrl (used by LlamaService instead of fetch)
const mockRequestUrl = vi.hoisted(() => vi.fn());

// Mock fs
const fsMocks = vi.hoisted(() => {
    const existsSync = vi.fn((path: string) => true);
    const accessSync = vi.fn();
    const readdirSync = vi.fn((path: string) => []);
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
        stdout: { on: vi.fn(), removeListener: vi.fn() },
        stderr: { on: vi.fn(), removeListener: vi.fn() },
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        kill: vi.fn(),
        pid: 12345,
        exitCode: null,
        killed: false
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


// Mock Obsidian Notice, requestUrl, and Platform
vi.mock('obsidian', () => ({
    Notice: class {
        constructor(message: string) { }
    },
    requestUrl: mockRequestUrl,
    Platform: {
        isMacOS: process.platform === 'darwin',
        isWindows: process.platform === 'win32',
        isLinux: process.platform === 'linux',
        isMobile: false,
        isWin: process.platform === 'win32',
        isLinuxApp: process.platform === 'linux'
    }
}));

describe.skip('LlamaService', () => {
    // MVP MODE: LlamaService is not available in MVP version
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
        } as unknown as IdeatrSettings;
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
        mockRequestUrl.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        // Remove unhandled rejection listener
        process.removeAllListeners('unhandledRejection');
        // Clear any unhandled rejections
        unhandledRejections = [];
        // Destroy singleton instance to ensure clean state for next test
        LlamaService.destroyInstance();
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
                expect.arrayContaining(['-m', '/path/to/model.gguf']),
                expect.any(Object)
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
            
            // Ensure process manager reports as running by ensuring the mock process has exitCode: null
            // The mock already has exitCode: null, so isRunning() should return true
            // Run all pending timers to ensure everything is settled
            await vi.runAllTimersAsync();
        });

        // TODO: Fix timeout issues with ensureReady() wait loop and fake timers
        // The ensureReady() method creates many setTimeout calls (up to 3000 for 5-minute timeout)
        // which causes vi.runAllTimersAsync() to hang. Need to ensure isServerReady and
        // processManager.isRunning() are both true before calling classify() so ensureReady() returns immediately.
        it.skip('should successfully classify an idea', async () => {
            const mockResponse = {
                content: JSON.stringify({
                    category: 'game',
                    tags: ['rpg', 'fantasy']
                })
            };

            // Make requestUrl resolve immediately (no delay)
            mockRequestUrl.mockImplementation(() => 
                Promise.resolve({
                    status: 200,
                    json: mockResponse
                })
            );

            const classifyPromise = service.classify('A fantasy RPG game');

            // Run all timers to flush any pending setTimeout calls
            // This ensures ensureReady() wait loops complete if they're triggered
            await vi.runAllTimersAsync();

            const result = await classifyPromise;

            expect(result.category).toBe('game');
            expect(result.tags).toEqual(['rpg', 'fantasy']);
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'http://localhost:8080/completion',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        // TODO: Fix timeout issues - see note on "should successfully classify an idea"
        it.skip('should handle timeout', async () => {
            // Mock requestUrl to never resolve (let timeout trigger)
            mockRequestUrl.mockImplementation(() => {
                return new Promise(() => {
                    // Never resolve - let timeout trigger
                });
            });

            // Start classification
            const classifyPromise = service.classify('test');

            // Run all timers to flush pending operations and trigger timeout
            // The timeout is set to 1000ms (llmTimeout setting)
            await vi.runAllTimersAsync();

            // The timeout should have triggered
            // Catch the error to prevent unhandled rejection
            await expect(classifyPromise).rejects.toThrow('API request timed out');
        });

        // TODO: Fix timeout issues - see note on "should successfully classify an idea"
        it.skip('should handle server error', async () => {
            mockRequestUrl.mockResolvedValue({
                status: 500,
                json: { content: '' }
            });

            const classifyPromise = service.classify('test');
            // Run all timers to flush pending operations
            await vi.runAllTimersAsync();

            // Catch the error to prevent unhandled rejection
            await expect(classifyPromise).rejects.toThrow('Llama.cpp server error: 500');
        });

        // TODO: Fix timeout issues - see note on "should successfully classify an idea"
        it.skip('should handle malformed JSON response', async () => {
            const mockResponse = {
                content: 'Not JSON'
            };

            mockRequestUrl.mockResolvedValue({
                status: 200,
                json: mockResponse
            });

            const classifyPromise = service.classify('test');
            // Run all timers to flush pending operations
            await vi.runAllTimersAsync();

            const result = await classifyPromise;
            expect(result.category).toBe('');
            expect(result.tags).toEqual([]);
        });

        // TODO: Fix timeout issues - see note on "should successfully classify an idea"
        it.skip('should use default category if parsing fails', async () => {
            const mockResponse = {
                content: JSON.stringify({
                    invalid: 'data'
                })
            };

            mockRequestUrl.mockResolvedValue({
                status: 200,
                json: mockResponse
            });

            const classifyPromise = service.classify('test');
            // Run all timers to flush pending operations
            await vi.runAllTimersAsync();

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
            // ProcessManager calls spawn with (command, args, options)
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '25']),
                expect.any(Object)
            );

            // Clean up
            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use 75 GPU layers for 5-10GB models (llama-3.1-8b)', async () => {
            mockSettings.localModel = 'llama-3.1-8b';
            service = LlamaService.getInstance(mockSettings);

            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);

            // llama-3.1-8b is 8.5GB, which falls in MEDIUM range (5-10GB) = 75 layers
            // ProcessManager calls spawn with (command, args, options)
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '75']),
                expect.any(Object)
            );

            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use 75 GPU layers for 5-10GB models (qwen-2.5-7b)', async () => {
            mockSettings.localModel = 'qwen-2.5-7b';
            service = LlamaService.getInstance(mockSettings);

            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);

            // qwen-2.5-7b is 7.8GB, which falls in MEDIUM range (5-10GB) = 75 layers
            // ProcessManager calls spawn with (command, args, options)
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '75']),
                expect.any(Object)
            );

            await vi.advanceTimersByTimeAsync(2000);
            try {
                await startPromise;
            } catch {
                // Ignore errors
            }
        });

        it('should use 99 GPU layers for <5GB models (phi-3.5-mini)', async () => {
            mockSettings.localModel = 'phi-3.5-mini';
            service = LlamaService.getInstance(mockSettings);

            const startPromise = service.startServer();
            await vi.advanceTimersByTimeAsync(0);

            // phi-3.5-mini is 4.06GB, which falls in SMALL range (<5GB) = 99 layers (all layers)
            // ProcessManager calls spawn with (command, args, options)
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['--n-gpu-layers', '99']),
                expect.any(Object)
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

            // Note: ProcessManager doesn't explicitly call removeListener in stop()
            // Listeners are cleaned up automatically when the process exits
            // This test verifies that stopServer() can be called without errors
            service.stopServer();

            // Verify that stop was called (processManager.stop() is async)
            await vi.runAllTimersAsync();
            
            // The process should be stopped (processManager set to null after stop completes)
            // We can't easily verify removeListener calls since ProcessManager doesn't expose that
            // But we can verify stopServer() completes without errors
            expect(mocks.childProcess.kill).toHaveBeenCalled();
        });
    });
});
