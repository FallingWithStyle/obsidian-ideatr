import type { ILLMService, ClassificationResult, IdeaCategory } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { APITimeoutError, NetworkError, ClassificationError } from '../types/classification';
import { spawn, ChildProcess, execSync } from 'child_process';
import { Notice } from 'obsidian';
import { ModelManager } from './ModelManager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { extractAndRepairJSON } from '../utils/jsonRepair';
import { Logger } from '../utils/logger';

/**
 * LlamaService - Integrates with local Llama.cpp server
 */
export class LlamaService implements ILLMService {
    private settings: IdeatrSettings;
    private serverProcess: ChildProcess | null = null;
    private isServerReady: boolean = false;
    private idleTimeout: number = 15 * 60 * 1000; // 15 minutes
    private idleTimer: NodeJS.Timeout | null = null;
    // @ts-ignore - lastUseTime is written to but not read (used for tracking)
    private lastUseTime: number = 0;
    private loadingState: 'not-loaded' | 'loading' | 'ready' | 'idle' = 'not-loaded';
    private modelManager: ModelManager;
    private pluginDir: string | null = null;

    constructor(settings: IdeatrSettings, pluginDir?: string) {
        this.settings = settings;
        this.modelManager = new ModelManager();
        this.pluginDir = pluginDir || null;
        // Update idle timeout if setting changes
        if (settings.keepModelLoaded) {
            // If keepModelLoaded is true, don't set up idle timeout
            this.idleTimeout = 0;
        }
    }

    /**
     * Get the effective binary path, using bundled binary if available
     */
    private getEffectiveBinaryPath(): string | null {
        // User-configured path takes precedence
        if (this.settings.llamaBinaryPath) {
            return this.settings.llamaBinaryPath;
        }

        // Check for bundled binary (primary path)
        if (this.pluginDir) {
            const platformKey = `${os.platform()}-${os.arch()}`;
            const binaryName = os.platform() === 'win32' ? 'llama-server.exe' : 'llama-server';
            const bundledBinaryPath = path.join(this.pluginDir, 'binaries', platformKey, binaryName);
            
            try {
                if (fs.existsSync(bundledBinaryPath)) {
                    // Check if file is executable, make it executable if needed
                    try {
                        fs.accessSync(bundledBinaryPath, fs.constants.X_OK);
                        Logger.debug('Using bundled binary:', bundledBinaryPath);
                        return bundledBinaryPath;
                    } catch {
                        // File exists but not executable, try to make it executable
                        try {
                            fs.chmodSync(bundledBinaryPath, 0o755);
                            Logger.debug('Using bundled binary (made executable):', bundledBinaryPath);
                            return bundledBinaryPath;
                        } catch (error) {
                            Logger.warn('Bundled binary exists but cannot be made executable:', bundledBinaryPath, error);
                            // Still return it - spawn might work anyway
                            return bundledBinaryPath;
                        }
                    }
                } else {
                    Logger.warn('Bundled binary not found at:', bundledBinaryPath);
                    Logger.warn('Expected platform:', platformKey, 'binary:', binaryName);
                }
            } catch (error) {
                console.error(`[LlamaService] Error checking bundled binary: ${error}`);
            }
        }

        // Fallback: Try to find binary in PATH (for development/testing)
        // This is a convenience fallback, but bundled binary should be primary
        const binaryNames = ['llama-server', 'server'];
        for (const binName of binaryNames) {
            try {
                const whichResult = execSync(`which ${binName}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
                if (whichResult && fs.existsSync(whichResult)) {
                    try {
                        fs.accessSync(whichResult, fs.constants.X_OK);
                        Logger.warn('Using fallback binary from PATH:', whichResult, '(bundled binary not found)');
                        return whichResult;
                    } catch {
                        // Continue searching
                    }
                }
            } catch {
                // Continue
            }
        }

        return null;
    }

    /**
     * Get the effective model path, using default if not configured
     * Looks for GGUF files in default locations
     */
    private async getEffectiveModelPath(): Promise<string | null> {
        if (this.settings.modelPath) {
            // Check if configured path exists and is a GGUF file
            if (fs.existsSync(this.settings.modelPath)) {
                if (this.settings.modelPath.endsWith('.gguf')) {
                    return this.settings.modelPath;
                }
                Logger.warn('Configured model path doesn\'t end with .gguf:', this.settings.modelPath);
            }
        }

        // Use ModelManager's default path (GGUF file)
        const defaultPath = this.modelManager.getModelPath();
        try {
            // Check if GGUF model exists at default location
            if (fs.existsSync(defaultPath) && defaultPath.endsWith('.gguf')) {
                Logger.debug('Using GGUF model at default location:', defaultPath);
                return defaultPath;
            }
        } catch {
            // Model doesn't exist at default location
        }

        // Also check for any GGUF files in the default model directory
        try {
            const modelDir = path.dirname(defaultPath);
            if (fs.existsSync(modelDir)) {
                const files = fs.readdirSync(modelDir);
                const ggufFiles = files.filter(f => f.endsWith('.gguf'));
                if (ggufFiles.length > 0) {
                    // Use the first GGUF file found
                    const foundPath = path.join(modelDir, ggufFiles[0]);
                    Logger.debug('Found GGUF model in default directory:', foundPath);
                    return foundPath;
                }
            }
        } catch {
            // Couldn't read directory
        }

        return null;
    }

    async startServer(): Promise<void> {
        // If already running, return early
        if (this.serverProcess) {
            Logger.debug('Server already running');
            return;
        }

        // Validate configuration
        if (!this.settings.llamaBinaryPath) {
            throw new Error('Llama binary path not configured. Please set it in settings.');
        }
        if (!this.settings.modelPath) {
            throw new Error('Model path not configured. Please set it in settings.');
        }

        this.loadingState = 'loading';
        Logger.debug('Starting Llama server...');
        Logger.debug('Binary:', this.settings.llamaBinaryPath);
        Logger.debug('Model:', this.settings.modelPath);
        Logger.debug('Port:', this.settings.llamaServerPort);
        
        // Show loading notice on first use
        if (this.loadingState === 'loading') {
            new Notice('Loading AI model... (~10 seconds)');
        }

        try {
            this.serverProcess = spawn(this.settings.llamaBinaryPath, [
                '-m', this.settings.modelPath,
                '--port', String(this.settings.llamaServerPort),
                '--ctx-size', '2048',
                '--n-gpu-layers', '99', // Try to use GPU
                '--parallel', String(this.settings.concurrency)
            ]);

            // Track if server failed to start
            let serverStartError: Error | null = null;
            let processExited = false;
            let exitCode: number | null = null;
            let errorMessage: string | null = null;

            this.serverProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                Logger.debug('[Llama Server]', output.trim());
                // Check for server ready messages (various formats)
                if (output.includes('HTTP server listening') || 
                    output.includes('server is listening') ||
                    output.includes('listening on http')) {
                    this.isServerReady = true;
                    this.loadingState = 'ready';
                    Logger.debug('Server is ready!');
                    new Notice('Llama AI Server Started');
                }
            });

            this.serverProcess.stderr?.on('data', (data) => {
                const errorOutput = data.toString();
                const outputLines = errorOutput.split('\n').filter((line: string) => line.trim());
                
                // llama.cpp outputs all messages to stderr, including informational ones
                // Check for actual errors vs informational messages
                const isError = outputLines.some((line: string) => 
                    (line.toLowerCase().includes('error') || 
                     line.toLowerCase().includes('failed') ||
                     line.toLowerCase().includes('fatal')) &&
                    !line.toLowerCase().includes('ggml_metal') && // Metal init messages are info
                    !line.toLowerCase().includes('system info') &&
                    !line.toLowerCase().includes('llama_model_loader') &&
                    !line.toLowerCase().includes('print_info') &&
                    !line.toLowerCase().includes('load:') &&
                    !line.toLowerCase().includes('llama_context') &&
                    !line.toLowerCase().includes('main:')
                );
                
                // Log informational messages at debug level, errors at error level
                for (const line of outputLines) {
                    if (isError && (line.toLowerCase().includes('error') || 
                                   line.toLowerCase().includes('failed') ||
                                   line.toLowerCase().includes('fatal'))) {
                        console.error('[Llama Server]', line.trim());
                    } else {
                        // Most llama.cpp output is informational, log at debug level
                        Logger.debug('[Llama Server]', line.trim());
                    }
                }
                
                // Check for server ready messages in stderr (llama.cpp outputs info to stderr)
                if (errorOutput.includes('HTTP server is listening') || 
                    errorOutput.includes('server is listening on http') ||
                    errorOutput.includes('main: server is listening')) {
                    this.isServerReady = true;
                    this.loadingState = 'ready';
                    Logger.debug('Server is ready!');
                    new Notice('Llama AI Server Started');
                }
                // Check for common startup errors (but not info messages)
                if (isError) {
                    errorMessage = errorOutput.trim();
                    serverStartError = new Error(`Server startup error: ${errorOutput.trim()}`);
                }
            });

            this.serverProcess.on('close', (code) => {
                Logger.debug('Server exited with code', code);
                processExited = true;
                exitCode = code;
                this.serverProcess = null;
                this.isServerReady = false;
                this.loadingState = 'not-loaded';
                this.lastUseTime = 0;
                if (code !== 0 && code !== null) {
                    console.error(`[LlamaService] Server exited with error code ${code}`);
                    if (!serverStartError) {
                        serverStartError = new Error(`Server process exited with code ${code}`);
                    }
                }
            });

            // Check for immediate spawn errors
            this.serverProcess.on('error', (error) => {
                console.error('[LlamaService] Failed to spawn server process:', error);
                serverStartError = error;
                this.serverProcess = null;
                this.loadingState = 'not-loaded';
                new Notice('Failed to start Llama AI Server - check binary path');
            });

            // Wait a bit for startup
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if process exited during startup
            if (processExited) {
                this.serverProcess = null;
                this.loadingState = 'not-loaded';
                const errorMsg = errorMessage || `Server process exited during startup with code ${exitCode}`;
                throw new Error(errorMsg);
            }

            // Check if server failed to start
            if (serverStartError) {
                this.serverProcess = null;
                this.loadingState = 'not-loaded';
                const errorMsg = errorMessage || 'Server failed to start';
                throw new Error(errorMsg);
            }

            // If process died immediately, throw error
            if (!this.serverProcess) {
                throw new Error('Server process failed to start');
            }

        } catch (error) {
            console.error('[LlamaService] Failed to start Llama server:', error);
            this.loadingState = 'not-loaded';
            this.serverProcess = null;
            new Notice('Failed to start Llama AI Server');
            throw error; // Re-throw so caller knows it failed
        }
    }

    stopServer(): void {
        if (this.serverProcess) {
            Logger.debug('Stopping Llama server...');
            this.clearIdleTimer();
            this.serverProcess.kill();
            this.serverProcess = null;
            this.isServerReady = false;
            this.loadingState = 'not-loaded';
            this.lastUseTime = 0;
        }
    }

    private unloadModel(): void {
        if (this.serverProcess && !this.settings.keepModelLoaded) {
            Logger.debug('Unloading model due to idle timeout');
            this.stopServer();
        }
    }

    private resetIdleTimer(): void {
        if (this.settings.keepModelLoaded) {
            return; // Don't unload if user wants it kept loaded
        }

        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }

        this.lastUseTime = Date.now();
        this.loadingState = 'ready';

        this.idleTimer = setTimeout(() => {
            this.unloadModel();
        }, this.idleTimeout);
    }

    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    async classify(text: string): Promise<ClassificationResult> {
        if (!this.isAvailable()) {
            throw new Error('Llama provider is not enabled');
        }

        // Ensure server is ready (abstracts away the implementation)
        const isReady = await this.ensureReady();
        if (!isReady) {
            const binaryPath = this.getEffectiveBinaryPath();
            const modelPath = await this.getEffectiveModelPath();
            let errorMsg = 'Llama binary or model path not found. ';
            if (!binaryPath && !modelPath) {
                errorMsg += 'Please configure paths in settings or install llama-server and download the model.';
            } else if (!binaryPath) {
                errorMsg += 'Please configure llama binary path in settings or install llama-server.\n';
                errorMsg += 'Installation options:\n';
                errorMsg += '  • Homebrew: brew install llama.cpp\n';
                errorMsg += '  • Build from source: https://github.com/ggerganov/llama.cpp\n';
                errorMsg += '  • Or use Ollama via the Custom provider option in settings';
            } else {
                errorMsg += 'Please configure model path in settings or download the model.';
            }
            throw new Error(errorMsg);
        }

        // Reset idle timer on each use
        this.resetIdleTimer();

        const prompt = this.constructPrompt(text);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.settings.llmTimeout);

            const response = await fetch(`${this.settings.llamaServerUrl}/completion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: 128,
                    temperature: 0.1,
                    stop: ['}'], // Stop generation after JSON object closes
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new NetworkError(`Llama.cpp server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseResponse(data.content);

        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError' || error.message.includes('aborted')) {
                    throw new APITimeoutError(`API request timed out after ${this.settings.llmTimeout}ms`);
                }
                if (error instanceof NetworkError) {
                    throw error;
                }
                throw new ClassificationError('Failed to classify idea', error);
            }
            throw new ClassificationError('Unknown error occurred');
        }
    }

    isAvailable(): boolean {
        return this.settings.llmProvider === 'llama';
    }

    /**
     * Ensure the LLM service is ready - start server if not already running
     * @returns true if ready, false if not configured (but available)
     */
    async ensureReady(): Promise<boolean> {
        if (!this.isAvailable()) {
            // Provider not enabled, nothing to do
            return false;
        }

        // Get effective paths (use defaults if not configured)
        const binaryPath = this.getEffectiveBinaryPath();
        const modelPath = await this.getEffectiveModelPath();

        // If we can't find paths, can't start server - return false
        if (!binaryPath || !modelPath) {
            if (!binaryPath && !modelPath) {
                Logger.debug('Binary and model paths not found (checked defaults)');
            } else if (!binaryPath) {
                Logger.debug('Binary path not found (checked common locations)');
                Logger.debug('To install llama-server on macOS:');
                Logger.debug('  1. Install via Homebrew: brew install llama.cpp');
                Logger.debug('  2. Or build from source: https://github.com/ggerganov/llama.cpp');
                Logger.debug('  3. Or configure the binary path manually in settings');
                Logger.debug('  4. Alternatively, use Ollama via the Custom provider option');
            } else {
                Logger.debug('Model path not found (checked default location)');
            }
            return false;
        }

        // If server is already running and ready, we're good
        if (this.serverProcess && this.isServerReady) {
            return true;
        }

        // If server process exists but not ready, wait for it
        if (this.serverProcess && !this.isServerReady) {
            Logger.debug('Server process exists but not ready, waiting...');
            let attempts = 0;
            while (!this.isServerReady && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (this.isServerReady) {
                return true;
            }
            // If still not ready, try starting fresh
            Logger.warn('Server process exists but never became ready, restarting...');
            this.stopServer();
        }

        // Start server if not running
        if (!this.serverProcess) {
            Logger.debug('Ensuring server is ready...');
            // Use effective paths for starting server
            const binaryPath = this.getEffectiveBinaryPath();
            const modelPath = await this.getEffectiveModelPath();
            if (!binaryPath || !modelPath) {
                throw new Error('Cannot start server: binary or model path not found');
            }
            // Temporarily set paths for startServer
            const originalBinaryPath = this.settings.llamaBinaryPath;
            const originalModelPath = this.settings.modelPath;
            this.settings.llamaBinaryPath = binaryPath;
            this.settings.modelPath = modelPath;
            try {
                await this.startServer();
            } finally {
                // Restore original paths (don't save defaults to settings)
                this.settings.llamaBinaryPath = originalBinaryPath;
                this.settings.modelPath = originalModelPath;
            }
            // Wait for server to be ready
            let attempts = 0;
            while (!this.isServerReady && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (!this.isServerReady) {
                throw new Error('Server started but did not become ready in time');
            }
        }
        
        return true;
    }

    /**
     * Generic completion method for non-classification tasks
     * @param prompt - The prompt to send to the LLM
     * @param options - Optional configuration (temperature, max tokens, stop tokens)
     * @returns The raw completion text
     */
    async complete(
        prompt: string,
        options?: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
        }
    ): Promise<string> {
        if (!this.isAvailable()) {
            throw new Error('Llama provider is not enabled');
        }

        // Ensure server is ready (abstracts away the implementation)
        const isReady = await this.ensureReady();
        if (!isReady) {
            const binaryPath = this.getEffectiveBinaryPath();
            const modelPath = await this.getEffectiveModelPath();
            let errorMsg = 'Llama binary or model path not found. ';
            if (!binaryPath && !modelPath) {
                errorMsg += 'Please configure paths in settings or install llama-server and download the model.';
            } else if (!binaryPath) {
                errorMsg += 'Please configure llama binary path in settings or install llama-server.\n';
                errorMsg += 'Installation options:\n';
                errorMsg += '  • Homebrew: brew install llama.cpp\n';
                errorMsg += '  • Build from source: https://github.com/ggerganov/llama.cpp\n';
                errorMsg += '  • Or use Ollama via the Custom provider option in settings';
            } else {
                errorMsg += 'Please configure model path in settings or download the model.';
            }
            throw new Error(errorMsg);
        }

        // Reset idle timer on each use
        this.resetIdleTimer();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.settings.llmTimeout);

            const response = await fetch(`${this.settings.llamaServerUrl}/completion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: options?.n_predict || 256,
                    temperature: options?.temperature ?? 0.7,
                    stop: options?.stop || ['}'],
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new NetworkError(`Llama.cpp server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.content || '';

        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError' || error.message.includes('aborted')) {
                    throw new APITimeoutError(`API request timed out after ${this.settings.llmTimeout}ms`);
                }
                if (error instanceof NetworkError) {
                    throw error;
                }
                throw new ClassificationError('Failed to complete request', error);
            }
            throw new ClassificationError('Unknown error occurred');
        }
    }

    private constructPrompt(text: string): string {
        return `Classify this idea into one category and suggest 2-4 relevant tags.

Idea: "${text}"

Categories: game, saas, tool, story, mechanic, hardware, ip, brand, ux, personal

Rules:
- Choose the single best category
- Tags should be specific and relevant (2-4 tags)
- Use lowercase for category and tags

Example response:
{
  "category": "game",
  "tags": ["rpg", "fantasy", "multiplayer"]
}

Response:
{`;
    }

    private parseResponse(content: string): ClassificationResult {
        try {
            // Extract and repair JSON from response
            const repaired = extractAndRepairJSON(content, false);
            const parsed = JSON.parse(repaired);

            return {
                category: this.validateCategory(parsed.category),
                tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
                confidence: 0.8 // Placeholder confidence
            };
        } catch (error) {
            Logger.warn('Failed to parse Llama response:', content, error);
            return {
                category: '',
                tags: [],
                confidence: 0
            };
        }
    }

    private validateCategory(category: string): IdeaCategory {
        const validCategories: IdeaCategory[] = [
            'game', 'saas', 'tool', 'story', 'mechanic',
            'hardware', 'ip', 'brand', 'ux', 'personal'
        ];

        const normalized = category?.toLowerCase().trim() as IdeaCategory;
        return validCategories.includes(normalized) ? normalized : '';
    }
}
