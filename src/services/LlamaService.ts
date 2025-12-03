import type { ILLMService, ClassificationResult, IdeaCategory } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { APITimeoutError, NetworkError, ClassificationError } from '../types/classification';
import { spawn, ChildProcess, execSync } from 'child_process';
import { Notice, requestUrl } from 'obsidian';
// @ts-ignore - MODELS will be used for chat template support
import { ModelManager, MODELS } from './ModelManager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { extractAndRepairJSON } from '../utils/jsonRepair';
import { Logger } from '../utils/logger';
import { checkModelCompatibility, getSystemInfoString } from '../utils/systemCapabilities';
import { ProcessHealthMonitor } from '../utils/ProcessHealthMonitor';

/**
 * LlamaService - Integrates with local Llama.cpp server
 * Singleton pattern ensures only one instance manages the llama-server process
 */
export class LlamaService implements ILLMService {
    private static instance: LlamaService | null = null;
    private static instanceLock: boolean = false;

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
    private processHealthMonitor: ProcessHealthMonitor;
    private isCleaningUp: boolean = false; // Flag to prevent operations during cleanup
    // Event handlers for cleanup
    private stdoutHandler: ((data: Buffer) => void) | null = null;
    private stderrHandler: ((data: Buffer) => void) | null = null;
    private closeHandler: ((code: number | null, signal: NodeJS.Signals | null) => void) | null = null;
    private errorHandler: ((error: Error) => void) | null = null;
    private healthCheckTimer: NodeJS.Timeout | null = null;

    private constructor(settings: IdeatrSettings, pluginDir?: string) {
        this.settings = settings;
        // Initialize ModelManager with selected model
        this.modelManager = new ModelManager(settings.localModel || 'phi-3.5-mini');
        this.pluginDir = pluginDir || null;
        this.processHealthMonitor = new ProcessHealthMonitor();
        // Update idle timeout if setting changes
        if (settings.keepModelLoaded) {
            // If keepModelLoaded is true, don't set up idle timeout
            this.idleTimeout = 0;
        }
    }

    /**
     * Calculate appropriate number of GPU layers based on model size
     * Larger models need fewer GPU layers to avoid memory issues
     * Returns a conservative estimate to prevent OOM errors
     */
    private calculateGPULayers(): number {
        const modelKey = this.settings.localModel || 'phi-3.5-mini';
        const modelConfig = MODELS[modelKey];

        if (!modelConfig) {
            // Fallback: conservative default
            return 35; // Safe default for unknown models
        }

        // Model size in GB
        const modelSizeGB = modelConfig.sizeMB / 1024;

        // Calculate GPU layers based on model size
        // For 70B models (~42GB), we need to be very conservative
        // Metal on Apple Silicon has ~29GB recommended max working set
        // A 70B Q4_K_M model needs ~40GB, so we can only load a fraction to GPU

        if (modelSizeGB >= 40) {
            // Very large models (70B): Load only ~30-40% to GPU, rest on CPU
            // 80 layers total for 70B, so ~25-30 layers on GPU
            return 25;
        } else if (modelSizeGB >= 20) {
            // Large models (30B-40B): Load ~50-60% to GPU
            return 40;
        } else if (modelSizeGB >= 10) {
            // Medium-large models (13B-20B): Load ~70-80% to GPU
            return 60;
        } else if (modelSizeGB >= 5) {
            // Medium models (7B-10B): Load most layers to GPU
            return 75;
        } else {
            // Small models (<5GB): Load all layers to GPU
            return 99;
        }
    }

    /**
     * Get recommended timeout based on model size, task type, and expected token count
     * Larger models need more time, especially for complex tasks like expansion
     * Timeout accounts for expected generation length (n_predict tokens)
     */
    private getRecommendedTimeout(
        taskType: 'classification' | 'completion' | 'expansion' = 'completion',
        n_predict: number = 256
    ): number {
        const modelKey = this.settings.localModel || 'phi-3.5-mini';
        const modelConfig = MODELS[modelKey];

        if (!modelConfig) {
            // Fallback to default if model not found
            return this.settings.llmTimeout;
        }

        // Estimate generation speed based on model size
        // Smaller models are typically faster, but we use conservative estimates
        // These are conservative estimates to ensure we have enough time
        let tokensPerSecond: number;
        if (modelConfig.sizeMB < 5000) {
            tokensPerSecond = 50; // Conservative: 50 tokens/sec for small models
        } else if (modelConfig.sizeMB < 10000) {
            tokensPerSecond = 30; // 30 tokens/sec for medium models
        } else if (modelConfig.sizeMB < 20000) {
            tokensPerSecond = 20; // 20 tokens/sec for large models
        } else {
            tokensPerSecond = 10; // 10 tokens/sec for very large models
        }

        // Calculate base timeout based on expected tokens
        // Add 5 seconds overhead for prompt processing and network latency
        const generationTimeMs = (n_predict / tokensPerSecond) * 1000;
        const overheadMs = 5000; // 5 seconds overhead
        let baseTimeout = Math.round(generationTimeMs + overheadMs);

        // Ensure minimum timeout based on model size
        // Small models (<5GB): 15s minimum
        // Medium models (5-10GB): 30s minimum
        // Large models (10-20GB): 45s minimum
        // Very large models (>20GB): 90s minimum
        let minTimeout: number;
        if (modelConfig.sizeMB < 5000) {
            minTimeout = 15000; // 15s for small models
        } else if (modelConfig.sizeMB < 10000) {
            minTimeout = 30000; // 30s for medium models
        } else if (modelConfig.sizeMB < 20000) {
            minTimeout = 45000; // 45s for large models
        } else {
            minTimeout = 90000; // 90s for very large models
        }

        // Adjust for task complexity
        // Expansion tasks are more complex and need more time
        const taskMultiplier = taskType === 'expansion' ? 1.5 : taskType === 'completion' ? 1.2 : 1.0;

        const recommendedTimeout = Math.round(Math.max(baseTimeout, minTimeout) * taskMultiplier);

        // Use the higher of user setting or recommended timeout
        // But respect user's setting if they've explicitly set a higher value
        return Math.max(this.settings.llmTimeout, recommendedTimeout);
    }

    /**
     * Get recommended model loading timeout based on model size
     * Large models like 70B can take 2-5 minutes to load
     */
    private getModelLoadingTimeout(): number {
        const modelKey = this.settings.localModel || 'phi-3.5-mini';
        const modelConfig = MODELS[modelKey];

        if (!modelConfig) {
            return 120000; // 2 minutes default
        }

        // Model size in GB
        const modelSizeGB = modelConfig.sizeMB / 1024;

        if (modelSizeGB >= 40) {
            // Very large models (70B): 5 minutes
            return 300000; // 5 minutes
        } else if (modelSizeGB >= 20) {
            // Large models: 4 minutes
            return 240000; // 4 minutes
        } else if (modelSizeGB >= 10) {
            // Medium-large models: 3 minutes
            return 180000; // 3 minutes
        } else {
            // Small-medium models: 2 minutes
            return 120000; // 2 minutes
        }
    }

    /**
     * Get or create singleton instance
     * Ensures only one LlamaService instance exists to prevent multiple server processes
     */
    static getInstance(settings: IdeatrSettings, pluginDir?: string): LlamaService {
        if (!LlamaService.instance) {
            if (LlamaService.instanceLock) {
                throw new Error('LlamaService instance is being created');
            }
            LlamaService.instanceLock = true;
            LlamaService.instance = new LlamaService(settings, pluginDir);
            LlamaService.instanceLock = false;
            Logger.debug('LlamaService singleton instance created');
        }
        return LlamaService.instance;
    }

    /**
     * Update settings for existing instance
     */
    updateSettings(settings: IdeatrSettings): void {
        this.settings = settings;
        // Update ModelManager if model changed
        this.modelManager = new ModelManager(settings.localModel || 'phi-3.5-mini');
        // Update idle timeout
        if (settings.keepModelLoaded) {
            this.idleTimeout = 0;
        } else {
            this.idleTimeout = 15 * 60 * 1000;
        }
    }

    /**
     * Destroy singleton instance (called on plugin unload)
     */
    static destroyInstance(): void {
        if (LlamaService.instance) {
            Logger.debug('Destroying LlamaService singleton instance');
            LlamaService.instance.cleanup();
            LlamaService.instance = null;
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
     * Tries to match the configured model, with smart fallback if exact filename doesn't match
     */
    private async getEffectiveModelPath(): Promise<string | null> {
        // Update ModelManager with current localModel setting (in case it changed)
        const modelKey = this.settings.localModel || 'phi-3.5-mini';
        this.modelManager = new ModelManager(modelKey);
        const modelConfig = this.modelManager.getModelConfig();

        Logger.debug('Looking for model:', modelConfig.name, `(key: ${modelKey})`);
        Logger.debug('Expected filename:', modelConfig.fileName);

        // User-configured path takes precedence
        if (this.settings.modelPath) {
            // Check if configured path exists and is a GGUF file
            if (fs.existsSync(this.settings.modelPath)) {
                if (this.settings.modelPath.endsWith('.gguf')) {
                    Logger.debug('Using user-configured model path:', this.settings.modelPath);
                    return this.settings.modelPath;
                }
                Logger.warn('Configured model path doesn\'t end with .gguf:', this.settings.modelPath);
            } else {
                Logger.warn('Configured model path does not exist:', this.settings.modelPath);
            }
        }

        // Use ModelManager's default path for the selected model
        const defaultPath = this.modelManager.getModelPath();
        try {
            // Check if the configured model exists at default location
            if (fs.existsSync(defaultPath) && defaultPath.endsWith('.gguf')) {
                Logger.debug('Using configured model at default location:', defaultPath);
                Logger.debug('Model:', modelConfig.name, `(${modelConfig.sizeMB}MB)`);
                return defaultPath;
            } else {
                // Model doesn't exist with exact filename - try to find a matching model
                Logger.debug(`Exact filename not found: ${modelConfig.fileName}`);
                Logger.debug('Searching for similar model files...');

                const modelDir = path.dirname(defaultPath);
                if (fs.existsSync(modelDir)) {
                    const files = fs.readdirSync(modelDir);
                    const ggufFiles = files.filter(f => f.endsWith('.gguf'));

                    Logger.debug(`Found ${ggufFiles.length} GGUF files in directory:`, ggufFiles);

                    // Try to find a file that matches the model name (case-insensitive, partial match)
                    const modelNameLower = modelConfig.name.toLowerCase();
                    const modelKeyParts = modelKey.split('-'); // e.g., ['qwen', '2.5', '7b']

                    for (const file of ggufFiles) {
                        const fileLower = file.toLowerCase();
                        // Check if filename contains model name or key parts
                        const matchesName = modelNameLower.split(' ').some(part =>
                            part.length > 2 && fileLower.includes(part)
                        );
                        const matchesKey = modelKeyParts.some(part =>
                            part.length > 2 && fileLower.includes(part)
                        );

                        if (matchesName || matchesKey) {
                            const foundPath = path.join(modelDir, file);
                            Logger.debug(`Found matching model file: ${file}`);
                            Logger.debug('Using:', foundPath);
                            Logger.warn(`Using model file "${file}" instead of expected "${modelConfig.fileName}"`);
                            Logger.warn('This may work, but the model might not match exactly. Consider renaming the file or downloading the correct model.');
                            return foundPath;
                        }
                    }

                    // If no match found, log all available files
                    Logger.warn(`Configured model "${modelConfig.name}" not found at: ${defaultPath}`);
                    Logger.warn(`Expected filename: ${modelConfig.fileName}`);
                    Logger.warn(`Available GGUF files in directory: ${ggufFiles.join(', ')}`);
                    Logger.warn('Please ensure the model filename matches, or download the model from Settings → AI Configuration → Local AI Model');
                } else {
                    Logger.warn(`Model directory does not exist: ${modelDir}`);
                }
            }
        } catch (error) {
            Logger.error('Error checking model path:', error);
        }

        // Return null if no matching model found
        return null;
    }

    async startServer(): Promise<void> {
        // Don't start if we're cleaning up
        if (this.isCleaningUp) {
            Logger.debug('Cannot start server - cleanup in progress');
            throw new Error('Cannot start server during plugin cleanup');
        }

        // If already running, return early
        if (this.serverProcess) {
            Logger.debug('Server already running');
            return;
        }

        // Get effective paths (use ModelManager if not explicitly configured)
        const binaryPath = this.getEffectiveBinaryPath();
        const modelPath = await this.getEffectiveModelPath();

        // Validate configuration
        if (!binaryPath) {
            throw new Error('Llama binary path not configured. Please set it in settings or ensure bundled binary is available.');
        }
        if (!modelPath) {
            throw new Error('Model path not configured. Please set it in settings or download a model.');
        }

        // Validate that files exist
        if (!fs.existsSync(binaryPath)) {
            throw new Error(`Llama binary not found at: ${binaryPath}. Please check the path in settings.`);
        }
        if (!fs.existsSync(modelPath)) {
            throw new Error(`Model file not found at: ${modelPath}. Please check the path in settings or download the model.`);
        }

        // Check if binary is executable (Unix-like systems)
        if (os.platform() !== 'win32') {
            try {
                fs.accessSync(binaryPath, fs.constants.X_OK);
            } catch {
                throw new Error(`Llama binary is not executable: ${binaryPath}. Please check file permissions.`);
            }
        }

        this.loadingState = 'loading';
        Logger.debug('Starting Llama server...');
        Logger.debug('Binary:', binaryPath);
        Logger.debug('Model:', modelPath);
        Logger.debug('Port:', this.settings.llamaServerPort);

        // Calculate appropriate GPU layers based on model size
        const gpuLayers = this.calculateGPULayers();
        Logger.debug('Calculated GPU layers:', gpuLayers);

        // Show loading notice on first use
        if (this.loadingState === 'loading') {
            const modelConfig = this.modelManager.getModelConfig();
            const modelSizeGB = modelConfig.sizeMB / 1024;
            const estimatedTime = modelSizeGB >= 40 ? '2-5 minutes' : modelSizeGB >= 20 ? '1-3 minutes' : '~30 seconds';
            new Notice(`Loading AI model... (${estimatedTime})`);
        }

        try {
            this.serverProcess = spawn(binaryPath, [
                '-m', modelPath,
                '--port', String(this.settings.llamaServerPort),
                '--ctx-size', '2048',
                '--n-gpu-layers', String(gpuLayers), // Adaptive based on model size
                '--parallel', String(this.settings.concurrency)
            ]);

            // Track process health
            this.processHealthMonitor.setProcess(this.serverProcess);

            // Track if server failed to start
            let serverStartError: Error | null = null;
            let processExited = false;
            let exitCode: number | null = null;
            let errorMessage: string = '';
            // Accumulate all stderr output for detailed logging on crash
            // Limit buffer size to prevent unbounded memory growth
            const MAX_BUFFER_SIZE = 1000; // Keep last 1000 lines
            const stderrBuffer: string[] = [];
            const stdoutBuffer: string[] = [];

            const addToBuffer = (buffer: string[], line: string) => {
                buffer.push(line);
                // Keep only recent entries to prevent unbounded growth
                if (buffer.length > MAX_BUFFER_SIZE) {
                    buffer.shift();
                }
            };

            Logger.debug('Starting server process with args:', [
                '-m', modelPath,
                '--port', String(this.settings.llamaServerPort),
                '--ctx-size', '2048',
                '--n-gpu-layers', String(gpuLayers),
                '--parallel', String(this.settings.concurrency)
            ]);

            // Store handlers so we can remove them later
            this.stdoutHandler = (data: Buffer) => {
                // Ignore stdout if we're cleaning up
                if (this.isCleaningUp) {
                    return;
                }

                const output = data.toString();
                addToBuffer(stdoutBuffer, output);
                Logger.debug('[Llama Server stdout]', output.trim());
                // Check for server listening (but model may still be loading)
                if (output.includes('HTTP server listening') ||
                    output.includes('server is listening') ||
                    output.includes('listening on http')) {
                    // Server is listening but model may still be loading
                    this.loadingState = 'loading';
                    Logger.debug('Server HTTP endpoint is listening (model may still be loading)');
                }
                // Check for model fully loaded - this is when server is truly ready
                if (output.includes('main: model loaded') ||
                    output.includes('model loaded')) {
                    this.isServerReady = true;
                    this.loadingState = 'ready';
                    Logger.debug('Server is ready! (Model fully loaded)');
                    new Notice('Llama AI Server Started');
                }
            };

            this.stderrHandler = (data: Buffer) => {
                // Ignore stderr if we're cleaning up
                if (this.isCleaningUp) {
                    return;
                }

                const errorOutput = data.toString();
                addToBuffer(stderrBuffer, errorOutput);
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
                        Logger.error('[Llama Server stderr]', line.trim());
                    } else {
                        // Most llama.cpp output is informational, log at debug level
                        Logger.debug('[Llama Server stderr]', line.trim());
                    }
                }

                // Check for server listening in stderr (llama.cpp outputs info to stderr)
                // Note: Server listening doesn't mean model is loaded yet
                if (errorOutput.includes('HTTP server is listening') ||
                    errorOutput.includes('server is listening on http') ||
                    errorOutput.includes('main: server is listening')) {
                    // Server is listening but model may still be loading
                    this.loadingState = 'loading';
                    Logger.debug('Server HTTP endpoint is listening (model may still be loading)');
                }
                // Check for model fully loaded - this is when server is truly ready
                if (errorOutput.includes('main: model loaded') ||
                    errorOutput.includes('model loaded')) {
                    this.isServerReady = true;
                    this.loadingState = 'ready';
                    Logger.debug('Server is ready! (Model fully loaded)');
                    new Notice('Llama AI Server Started');
                }
                // Check for common startup errors (but not info messages)
                if (isError) {
                    errorMessage = errorOutput.trim();

                    // Check for RAM/VRAM-related errors
                    const lowerOutput = errorOutput.toLowerCase();
                    const isRAMError = lowerOutput.includes('failed to load model') ||
                        lowerOutput.includes('out of memory') ||
                        lowerOutput.includes('insufficient memory') ||
                        lowerOutput.includes('iogpucommandbuffercallbackerroroutofmemory') ||
                        lowerOutput.includes('command buffer') && lowerOutput.includes('failed') ||
                        lowerOutput.includes('ggml_metal_log_allocated_size') && lowerOutput.includes('warning') ||
                        lowerOutput.includes('recommended max working set size') ||
                        lowerOutput.includes('vram') ||
                        (lowerOutput.includes('reduce') && lowerOutput.includes('gpu-layers'));

                    if (isRAMError) {
                        // Get model info and system capabilities
                        const modelConfig = this.modelManager.getModelConfig();
                        const compatibility = checkModelCompatibility(this.settings.localModel || 'phi-3.5-mini');
                        const systemInfo = getSystemInfoString();

                        // Create a more helpful error message
                        let enhancedError = `Model failed to load - likely insufficient RAM/VRAM.\n\n`;
                        enhancedError += `Model: ${modelConfig.name} (requires ${modelConfig.ram} RAM)\n`;
                        enhancedError += `${systemInfo}\n\n`;

                        if (!compatibility.isCompatible) {
                            enhancedError += `This model requires more RAM than your system has. `;
                        } else {
                            enhancedError += `Your system may not have enough free RAM to load this model. `;
                        }

                        enhancedError += `Consider switching to a smaller model like "Phi-3.5 Mini" (requires 6-8GB RAM) in Settings → AI Configuration → Local AI Model.\n\n`;
                        enhancedError += `Original error: ${errorOutput.trim()}`;

                        errorMessage = enhancedError;
                        serverStartError = new Error(enhancedError);
                    } else {
                        serverStartError = new Error(`Server startup error: ${errorOutput.trim()}`);
                    }
                }
            };

            this.serverProcess.stdout?.on('data', this.stdoutHandler);
            this.serverProcess.stderr?.on('data', this.stderrHandler);

            // Store close handler for cleanup
            this.closeHandler = (code: number | null, signal: NodeJS.Signals | null) => {
                // If we're cleaning up, don't process close events (they're expected)
                if (this.isCleaningUp) {
                    Logger.debug('Server process closed during cleanup (expected)');
                    return;
                }

                Logger.debug('Server process closed event fired', { code, signal });
                processExited = true;
                exitCode = code;

                // Log detailed information about the exit
                const fullStderr = stderrBuffer.join('');
                const fullStdout = stdoutBuffer.join('');

                Logger.error('[LlamaService] Server process exited', {
                    exitCode: code,
                    signal: signal,
                    wasKilled: code === null,
                    stderrLength: fullStderr.length,
                    stdoutLength: fullStdout.length,
                    binaryPath: binaryPath,
                    modelPath: modelPath
                });

                // If process was killed or exited with error, log full output
                if (code === null || (code !== 0 && code !== null)) {
                    if (fullStderr.length > 0) {
                        Logger.error('[LlamaService] Full stderr output from crashed server:');
                        Logger.error('--- BEGIN STDERR ---');
                        const stderrLines = fullStderr.split('\n');
                        for (const line of stderrLines) {
                            if (line.trim()) {
                                Logger.error(line.trim());
                            }
                        }
                        Logger.error('--- END STDERR ---');
                    }

                    if (fullStdout.length > 0) {
                        Logger.debug('[LlamaService] Full stdout output from crashed server:');
                        Logger.debug('--- BEGIN STDOUT ---');
                        const stdoutLines = fullStdout.split('\n');
                        for (const line of stdoutLines) {
                            if (line.trim()) {
                                Logger.debug(line.trim());
                            }
                        }
                        Logger.debug('--- END STDOUT ---');
                    }

                    // If we don't have an error message yet, use the stderr output
                    if (!errorMessage && fullStderr.length > 0) {
                        errorMessage = fullStderr.trim();
                    }
                }

                this.serverProcess = null;
                this.isServerReady = false;
                this.loadingState = 'not-loaded';
                this.lastUseTime = 0;
                if (code !== 0 && code !== null) {
                    Logger.error(`[LlamaService] Server exited with error code ${code}`);
                    if (!serverStartError) {
                        serverStartError = new Error(`Server process exited with code ${code}`);
                    }
                } else if (code === null) {
                    Logger.error(`[LlamaService] Server process was killed (SIGKILL or similar)`);
                    if (!serverStartError) {
                        serverStartError = new Error('Server process was terminated (killed)');
                    }
                }
            };

            this.serverProcess.on('close', this.closeHandler);

            // Store error handler for cleanup
            this.errorHandler = (error: Error) => {
                Logger.error('[LlamaService] Failed to spawn server process:', error);
                Logger.error('[LlamaService] Spawn error details:', {
                    binaryPath: binaryPath,
                    modelPath: modelPath,
                    errorName: error.name,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
                serverStartError = error;
                this.serverProcess = null;
                this.loadingState = 'not-loaded';
                new Notice('Failed to start Llama AI Server - check binary path');
            };

            this.serverProcess.on('error', this.errorHandler);

            // Wait a bit for startup
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if process exited during startup
            if (processExited) {
                this.serverProcess = null;
                this.loadingState = 'not-loaded';
                let errorMsg: string;
                if (exitCode === null) {
                    // Process was killed (SIGKILL) - likely a fatal error
                    // Use the actual paths that were used (from variables in scope)
                    const errorBinaryPath = binaryPath || 'not configured';
                    const errorModelPath = modelPath || 'not configured';

                    // Check if we already have a RAM-related error message
                    if (errorMessage && (errorMessage.includes('insufficient RAM') || errorMessage.includes('requires more RAM'))) {
                        errorMsg = errorMessage;
                    } else {
                        // Check if this might be a RAM issue based on model size
                        const modelConfig = this.modelManager.getModelConfig();
                        const compatibility = checkModelCompatibility(this.settings.localModel || 'phi-3.5-mini');
                        const systemInfo = getSystemInfoString();

                        const errorMsgLower = errorMessage.toLowerCase();
                        if (!compatibility.isCompatible || errorMsgLower.includes('failed to load model')) {
                            errorMsg = `Model failed to load - likely insufficient RAM/VRAM.\n\n` +
                                `Model: ${modelConfig.name} (requires ${modelConfig.ram} RAM)\n` +
                                `${systemInfo}\n\n` +
                                `This model requires more RAM than your system has or there isn't enough free RAM. ` +
                                `Consider switching to a smaller model like "Phi-3.5 Mini" (requires 6-8GB RAM) in Settings → AI Configuration → Local AI Model.\n\n` +
                                `Check the console for more details. Binary: ${errorBinaryPath}, Model: ${errorModelPath}`;
                        } else {
                            errorMsg = errorMessage ||
                                'Server process was terminated during startup. This may indicate:\n' +
                                '  • Binary or model file is corrupted\n' +
                                '  • Insufficient system resources (memory/disk)\n' +
                                '  • Permission issues\n' +
                                '  • Binary architecture mismatch\n' +
                                `Check the console for more details. Binary: ${errorBinaryPath}, Model: ${errorModelPath}`;
                        }
                    }
                } else {
                    errorMsg = errorMessage || `Server process exited during startup with code ${exitCode}`;
                }
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

            // Start health check
            this.startHealthCheck();

        } catch (error) {
            Logger.error('[LlamaService] Failed to start Llama server:', error);
            Logger.error('[LlamaService] Startup error details:', {
                binaryPath: binaryPath,
                modelPath: modelPath,
                errorName: error instanceof Error ? error.name : 'Unknown',
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined
            });
            this.loadingState = 'not-loaded';
            this.serverProcess = null;

            // Show a more helpful notice if it's a RAM-related error
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('insufficient RAM') || errorMessage.includes('requires more RAM') ||
                errorMessage.includes('failed to load model')) {
                new Notice('Model too large for system RAM. Consider switching to a smaller model in Settings.', 10000);
            } else {
                new Notice('Failed to start Llama AI Server');
            }
            throw error; // Re-throw so caller knows it failed
        }
    }

    stopServer(): void {
        if (this.serverProcess) {
            const wasLoading = this.loadingState === 'loading';
            Logger.debug('Stopping Llama server...', wasLoading ? '(model was loading)' : '');
            this.clearIdleTimer();
            this.stopHealthCheck();

            // Remove event listeners to prevent memory leaks and errors during cleanup
            try {
                if (this.stdoutHandler && this.serverProcess.stdout) {
                    this.serverProcess.stdout.removeListener('data', this.stdoutHandler);
                }
            } catch (error) {
                Logger.debug('Error removing stdout handler:', error);
            }

            try {
                if (this.stderrHandler && this.serverProcess.stderr) {
                    this.serverProcess.stderr.removeListener('data', this.stderrHandler);
                }
            } catch (error) {
                Logger.debug('Error removing stderr handler:', error);
            }

            try {
                if (this.closeHandler) {
                    this.serverProcess.removeListener('close', this.closeHandler);
                }
            } catch (error) {
                Logger.debug('Error removing close handler:', error);
            }

            try {
                if (this.errorHandler) {
                    this.serverProcess.removeListener('error', this.errorHandler);
                }
            } catch (error) {
                Logger.debug('Error removing error handler:', error);
            }

            // Clear handler references
            this.stdoutHandler = null;
            this.stderrHandler = null;
            this.closeHandler = null;
            this.errorHandler = null;

            // Kill the process gracefully, then forcefully if needed
            try {
                // Try SIGTERM first (graceful shutdown)
                if (this.serverProcess.killed === false) {
                    this.serverProcess.kill('SIGTERM');

                    // Wait a bit for graceful shutdown, then force kill if still running
                    setTimeout(() => {
                        if (this.serverProcess && !this.serverProcess.killed) {
                            Logger.debug('Force killing server process...');
                            try {
                                this.serverProcess.kill('SIGKILL');
                            } catch (error) {
                                Logger.debug('Error force killing process:', error);
                            }
                        }
                    }, 2000); // 2 second grace period
                }
            } catch (error) {
                Logger.debug('Error killing server process:', error);
                // Try force kill as fallback
                try {
                    if (this.serverProcess && !this.serverProcess.killed) {
                        this.serverProcess.kill('SIGKILL');
                    }
                } catch (killError) {
                    Logger.debug('Error force killing process:', killError);
                }
            }

            this.serverProcess = null;
            this.processHealthMonitor.setProcess(null);
            this.isServerReady = false;
            this.loadingState = 'not-loaded';
            this.lastUseTime = 0;

            if (wasLoading) {
                Logger.debug('Server stopped while model was loading (plugin unload during startup)');
            }
        }
    }

    /**
     * Comprehensive cleanup - called on plugin unload
     * Ensures all resources are properly released
     * Handles cleanup gracefully even if model is still loading
     */
    cleanup(): void {
        Logger.debug('LlamaService cleanup started');

        // Set cleanup flag to prevent new operations
        this.isCleaningUp = true;

        // Clear idle timer
        this.clearIdleTimer();

        // Stop server process (handles loading state gracefully)
        if (this.serverProcess) {
            const wasLoading = this.loadingState === 'loading';
            if (wasLoading) {
                Logger.debug('Plugin unload during model loading - stopping server gracefully...');
            }
            this.stopServer();
        }

        // Cancel any ongoing downloads
        try {
            if (this.modelManager?.isDownloadInProgress()) {
                Logger.debug('Canceling ongoing download...');
                this.modelManager.cancelDownload();
            }
        } catch (error) {
            Logger.debug('Error canceling download during cleanup:', error);
        }

        // Clear state
        this.isServerReady = false;
        this.loadingState = 'not-loaded';
        this.lastUseTime = 0;

        Logger.debug('LlamaService cleanup completed');
    }

    /**
     * Get process health information
     */
    getProcessHealth() {
        return this.processHealthMonitor.getHealth();
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

        // Retry logic for transient errors (503, connection issues)
        const maxRetries = 2;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Check if server process is still running before each retry
                if (attempt > 0) {
                    const isServerRunning = this.serverProcess !== null &&
                        this.serverProcess.exitCode === null;

                    if (!isServerRunning || this.serverProcess === null) {
                        Logger.warn('Server process not running, attempting restart...');
                        this.isServerReady = false;
                        this.serverProcess = null;
                        await this.ensureReady();
                        // Wait a bit for server to be ready
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else if (!this.isServerReady) {
                        // Server process exists but not ready, wait for it
                        Logger.warn('Server process exists but not ready, waiting...');
                        let waitAttempts = 0;
                        while (!this.isServerReady && waitAttempts < 20) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            waitAttempts++;
                        }
                    }
                }

                // Use requestUrl instead of fetch to bypass CORS restrictions in Electron
                // Use dynamic timeout based on model size (classification uses n_predict: 128)
                const timeout = this.getRecommendedTimeout('classification', 128);
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new APITimeoutError(`API request timed out after ${timeout}ms`)), timeout);
                });

                let response;
                try {
                    response = await Promise.race([
                        requestUrl({
                            url: `${this.settings.llamaServerUrl}/completion`,
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
                        }),
                        timeoutPromise
                    ]);
                } catch (requestError: unknown) {
                    // requestUrl throws errors for network issues, convert to NetworkError
                    if (requestError instanceof APITimeoutError) {
                        throw requestError;
                    }
                    const errorMsg = requestError instanceof Error ? requestError.message : String(requestError);
                    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('network') || errorMsg.includes('connection')) {
                        throw new NetworkError(`Connection failed: ${errorMsg}`);
                    }
                    throw new NetworkError(`Request failed: ${errorMsg}`);
                }

                if (response.status < 200 || response.status >= 300) {
                    // Handle 503 Service Unavailable - server might have crashed or be loading
                    if (response.status === 503) {
                        const isServerRunning = this.serverProcess !== null &&
                            this.serverProcess.exitCode === null;

                        if (!isServerRunning || this.serverProcess === null) {
                            Logger.warn('Server returned 503 and process is not running, will restart and retry');
                            this.isServerReady = false;
                            this.serverProcess = null;

                            // If this is not the last attempt, restart and retry
                            if (attempt < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                                continue;
                            }
                        } else {
                            // Server process is running but returned 503 - might be overloaded or still loading
                            Logger.warn(`Server returned 503 (attempt ${attempt + 1}/${maxRetries + 1})`);
                            if (attempt < maxRetries) {
                                // Wait a bit and retry
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                continue;
                            }
                        }

                        // If we've exhausted retries, provide helpful error message
                        const modelConfig = this.modelManager.getModelConfig();
                        const compatibility = checkModelCompatibility(this.settings.localModel || 'phi-3.5-mini');
                        const systemInfo = getSystemInfoString();

                        let errorMsg = `Model failed to load (503 Service Unavailable after ${maxRetries + 1} attempts).\n\n`;
                        errorMsg += `Model: ${modelConfig.name} (requires ${modelConfig.ram} RAM)\n`;
                        errorMsg += `${systemInfo}\n\n`;

                        if (!compatibility.isCompatible) {
                            errorMsg += `This model requires more RAM than your system has. `;
                        } else {
                            errorMsg += `Your system may not have enough free RAM to load this model. `;
                        }

                        errorMsg += `Consider switching to a smaller model like "Phi-3.5 Mini" (requires 6-8GB RAM) in Settings → AI Configuration → Local AI Model.`;

                        throw new NetworkError(errorMsg);
                    }
                    throw new NetworkError(`Llama.cpp server error: ${response.status}`);
                }

                // requestUrl returns json as a property, not a method
                const data = typeof response.json === 'function' ? await response.json() : response.json;
                if (!data || typeof data !== 'object') {
                    throw new ClassificationError('Invalid response format from server');
                }
                return this.parseResponse(data.content);

            } catch (error: unknown) {
                if (error instanceof Error) {
                    // Check for timeout errors (from Promise.race timeout)
                    if (error instanceof APITimeoutError || error.message.includes('timed out')) {
                        throw error;
                    }
                    if (error instanceof NetworkError) {
                        lastError = error;
                        // If it's a 503 network error and we have retries left, continue
                        if (attempt < maxRetries && error.message.includes('503')) {
                            Logger.warn(`Network error on attempt ${attempt + 1}, will retry...`);
                            continue;
                        }
                        throw error;
                    }
                    lastError = error;
                    // If not the last attempt and it's a connection error, retry
                    if (attempt < maxRetries && (
                        error.message.includes('ECONNREFUSED') ||
                        error.message.includes('network') ||
                        error.message.includes('connection') ||
                        error.message.includes('failed to fetch')
                    )) {
                        Logger.warn(`Connection error on attempt ${attempt + 1}, will retry...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    throw new ClassificationError('Failed to classify idea', error);
                }
                lastError = new Error('Unknown error occurred');
            }
        }

        // If we exhausted all retries, throw the last error
        throw lastError || new ClassificationError('Failed to classify idea after retries');
    }

    isAvailable(): boolean {
        return this.settings.llmProvider === 'llama';
    }

    /**
     * Get the current loading state
     */
    getLoadingState(): 'not-loaded' | 'loading' | 'ready' | 'idle' {
        return this.loadingState;
    }

    /**
     * Check if the server is ready
     */
    getIsServerReady(): boolean {
        return this.isServerReady;
    }

    /**
     * Check if server process exists
     */
    hasServerProcess(): boolean {
        return this.serverProcess !== null;
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
        // Use adaptive timeout based on model size
        if (this.serverProcess && !this.isServerReady) {
            Logger.debug('Server process exists but not ready, waiting for model to load...');
            const timeoutMs = this.getModelLoadingTimeout();
            const maxAttempts = timeoutMs / 100; // Convert to 100ms intervals
            let attempts = 0;
            while (!this.isServerReady && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
                // Log progress every 10 seconds
                if (attempts % 100 === 0) {
                    Logger.debug(`Still waiting for model to load... (${attempts / 10}s)`);
                }
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
            // startServer() now uses getEffectiveBinaryPath() and getEffectiveModelPath() directly
            await this.startServer();
            // Wait for server to be ready with adaptive timeout based on model size
            const timeoutMs = this.getModelLoadingTimeout();
            const maxAttempts = timeoutMs / 100; // Convert to 100ms intervals
            let attempts = 0;
            while (!this.isServerReady && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
                // Log progress every 10 seconds
                if (attempts % 100 === 0) {
                    Logger.debug(`Waiting for model to load... (${attempts / 10}s)`);
                }
            }
            if (!this.isServerReady) {
                const timeoutMinutes = Math.round(timeoutMs / 60000);
                throw new Error(`Server started but model did not load in time (${timeoutMinutes} minutes). The model may be too large for your system, or there may be insufficient memory.`);
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

        // Retry logic for transient errors (503, connection issues)
        const maxRetries = 2;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Check if server process is still running before each retry
                if (attempt > 0) {
                    const isServerRunning = this.serverProcess !== null &&
                        this.serverProcess.exitCode === null;

                    if (!isServerRunning || this.serverProcess === null) {
                        Logger.warn('Server process not running, attempting restart...');
                        this.isServerReady = false;
                        this.serverProcess = null;
                        await this.ensureReady();
                        // Wait a bit for server to be ready
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else if (!this.isServerReady) {
                        // Server process exists but not ready, wait for it
                        Logger.warn('Server process exists but not ready, waiting...');
                        let waitAttempts = 0;
                        while (!this.isServerReady && waitAttempts < 20) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            waitAttempts++;
                        }
                    }
                }

                // Use requestUrl instead of fetch to bypass CORS restrictions in Electron
                // Use dynamic timeout based on model size and expected token count
                // Check if this is an expansion task by looking at n_predict (expansion uses more tokens)
                const n_predict = options?.n_predict || 256;
                const isExpansion = n_predict > 1000;
                const timeout = this.getRecommendedTimeout(isExpansion ? 'expansion' : 'completion', n_predict);
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new APITimeoutError(`API request timed out after ${timeout}ms`)), timeout);
                });

                let response;
                try {
                    response = await Promise.race([
                        requestUrl({
                            url: `${this.settings.llamaServerUrl}/completion`,
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
                        }),
                        timeoutPromise
                    ]);
                } catch (requestError: unknown) {
                    // requestUrl throws errors for network issues, convert to NetworkError
                    if (requestError instanceof APITimeoutError) {
                        throw requestError;
                    }
                    const errorMsg = requestError instanceof Error ? requestError.message : String(requestError);
                    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('network') || errorMsg.includes('connection')) {
                        throw new NetworkError(`Connection failed: ${errorMsg}`);
                    }
                    throw new NetworkError(`Request failed: ${errorMsg}`);
                }

                if (response.status < 200 || response.status >= 300) {
                    // Handle 503 Service Unavailable - server might have crashed or be loading
                    if (response.status === 503) {
                        const isServerRunning = this.serverProcess !== null &&
                            this.serverProcess.exitCode === null;

                        if (!isServerRunning || this.serverProcess === null) {
                            Logger.warn('Server returned 503 and process is not running, will restart and retry');
                            this.isServerReady = false;
                            this.serverProcess = null;

                            // If this is not the last attempt, restart and retry
                            if (attempt < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                                continue;
                            }
                        } else {
                            // Server process is running but returned 503 - might be overloaded or still loading
                            Logger.warn(`Server returned 503 (attempt ${attempt + 1}/${maxRetries + 1})`);
                            if (attempt < maxRetries) {
                                // Wait a bit and retry
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                continue;
                            }
                        }

                        // If we've exhausted retries, provide helpful error message
                        const modelConfig = this.modelManager.getModelConfig();
                        const compatibility = checkModelCompatibility(this.settings.localModel || 'phi-3.5-mini');
                        const systemInfo = getSystemInfoString();

                        let errorMsg = `Model failed to load (503 Service Unavailable after ${maxRetries + 1} attempts).\n\n`;
                        errorMsg += `Model: ${modelConfig.name} (requires ${modelConfig.ram} RAM)\n`;
                        errorMsg += `${systemInfo}\n\n`;

                        if (!compatibility.isCompatible) {
                            errorMsg += `This model requires more RAM than your system has. `;
                        } else {
                            errorMsg += `Your system may not have enough free RAM to load this model. `;
                        }

                        errorMsg += `Consider switching to a smaller model like "Phi-3.5 Mini" (requires 6-8GB RAM) in Settings → AI Configuration → Local AI Model.`;

                        throw new NetworkError(errorMsg);
                    }
                    throw new NetworkError(`Llama.cpp server error: ${response.status}`);
                }

                // requestUrl returns json as a property, not a method
                const data = typeof response.json === 'function' ? await response.json() : response.json;
                if (!data || typeof data !== 'object') {
                    throw new ClassificationError('Invalid response format from server');
                }
                return data.content || '';

            } catch (error: unknown) {
                if (error instanceof Error) {
                    // Check for timeout errors (from Promise.race timeout)
                    if (error instanceof APITimeoutError || error.message.includes('timed out')) {
                        throw error;
                    }
                    if (error instanceof NetworkError) {
                        lastError = error;
                        // If it's a 503 network error and we have retries left, continue
                        if (attempt < maxRetries && error.message.includes('503')) {
                            Logger.warn(`Network error on attempt ${attempt + 1}, will retry...`);
                            continue;
                        }
                        throw error;
                    }
                    lastError = error;
                    // If not the last attempt and it's a connection error, retry
                    if (attempt < maxRetries && (
                        error.message.includes('ECONNREFUSED') ||
                        error.message.includes('network') ||
                        error.message.includes('connection') ||
                        error.message.includes('failed to fetch')
                    )) {
                        Logger.warn(`Connection error on attempt ${attempt + 1}, will retry...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    throw new ClassificationError('Failed to complete request', error);
                }
                lastError = new Error('Unknown error occurred');
            }
        }

        // If we exhausted all retries, throw the last error
        throw lastError || new ClassificationError('Failed to complete request after retries');
    }

    private constructPrompt(text: string): string {
        return `Classify ideas into ONE category and generate 3-5 relevant tags.

Categories: game, saas, tool, story, mechanic, hardware, ip, brand, ux, personal

Format: JSON only, no markdown

Examples:

Input: "A game about baristas stuck in a time loop where you optimize workflow"
Output: {"category": "game", "tags": ["time-loop", "service-industry", "roguelike", "optimization"]}

Input: "SaaS tool for managing restaurant inventory with AI predictions"
Output: {"category": "saas", "tags": ["restaurant", "inventory", "ai", "b2b", "operations"]}

Input: "Story about a sentient spaceship that falls in love with an asteroid"
Output: {"category": "story", "tags": ["sci-fi", "romance", "ai", "space"]}

Input: "Hardware device that translates dog barks into English"
Output: {"category": "hardware", "tags": ["pets", "translation", "iot", "consumer"]}

Input: "${text}"
Output: {`;
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

    private calculateMemoryLimit(): number {
        const modelConfig = this.modelManager.getModelConfig();
        // Base limit is model size + 4GB overhead to be safe
        return modelConfig.sizeMB + 4096;
    }

    private startHealthCheck(): void {
        if (this.healthCheckTimer) return;

        this.healthCheckTimer = setInterval(() => {
            const health = this.processHealthMonitor.getHealth();
            if (health.memoryUsageMB) {
                const limit = this.calculateMemoryLimit();
                // Only restart if we are consistently over limit (could add a counter here, but for now direct)
                if (health.memoryUsageMB > limit) {
                    Logger.warn(`Llama server memory usage (${health.memoryUsageMB.toFixed(0)}MB) exceeded limit (${limit.toFixed(0)}MB). Restarting...`);
                    new Notice('Restarting AI Server (Memory Limit Exceeded)');
                    this.restartServer();
                }
            }
        }, 30000); // Check every 30s
    }

    private stopHealthCheck(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    private async restartServer(): Promise<void> {
        Logger.info('Restarting server...');
        this.stopServer();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            await this.startServer();
        } catch (error) {
            Logger.error('Failed to restart server:', error);
            new Notice('Failed to auto-restart AI Server');
        }
    }
}
