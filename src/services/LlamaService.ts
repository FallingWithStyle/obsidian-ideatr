import type { ILLMService, ClassificationResult, IdeaCategory } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { APITimeoutError, NetworkError, ClassificationError } from '../types/classification';
import { spawn, ChildProcess } from 'child_process';
import { Notice } from 'obsidian';

/**
 * LlamaService - Integrates with local Llama.cpp server
 */
export class LlamaService implements ILLMService {
    private settings: IdeatrSettings;
    private serverProcess: ChildProcess | null = null;
    private isServerReady: boolean = false;
    private idleTimeout: number = 15 * 60 * 1000; // 15 minutes
    private idleTimer: NodeJS.Timeout | null = null;
    private _lastUseTime: number = 0;
    private loadingState: 'not-loaded' | 'loading' | 'ready' | 'idle' = 'not-loaded';

    constructor(settings: IdeatrSettings) {
        this.settings = settings;
        // Update idle timeout if setting changes
        if (settings.keepModelLoaded) {
            // If keepModelLoaded is true, don't set up idle timeout
            this.idleTimeout = 0;
        }
    }

    async startServer(): Promise<void> {
        if (this.serverProcess || !this.settings.llamaBinaryPath || !this.settings.modelPath) {
            return;
        }

        this.loadingState = 'loading';
        console.log('Starting Llama server...');
        
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

            this.serverProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                // console.log('[Llama Server]', output); // Verbose logging
                if (output.includes('HTTP server listening')) {
                    this.isServerReady = true;
                    this.loadingState = 'ready';
                    console.log('Llama server is ready!');
                    new Notice('Llama AI Server Started');
                }
            });

            this.serverProcess.stderr?.on('data', (data) => {
                console.error('[Llama Server Error]', data.toString());
            });

            this.serverProcess.on('close', (code) => {
                console.log(`Llama server exited with code ${code}`);
                this.serverProcess = null;
                this.isServerReady = false;
                this.loadingState = 'not-loaded';
                this._lastUseTime = 0;
            });

            // Wait a bit for startup
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error('Failed to start Llama server:', error);
            this.loadingState = 'not-loaded';
            new Notice('Failed to start Llama AI Server');
        }
    }

    stopServer(): void {
        if (this.serverProcess) {
            console.log('Stopping Llama server...');
            this.clearIdleTimer();
            this.serverProcess.kill();
            this.serverProcess = null;
            this.isServerReady = false;
            this.loadingState = 'not-loaded';
            this._lastUseTime = 0;
        }
    }

    private unloadModel(): void {
        if (this.serverProcess && !this.settings.keepModelLoaded) {
            console.log('[LlamaService] Unloading model due to idle timeout');
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

        this._lastUseTime = Date.now();
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

        // Auto-start if needed (lazy load)
        if (!this.serverProcess && this.settings.llamaBinaryPath) {
            await this.startServer();
            // Give it more time to warm up if just started
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (this.serverProcess && !this.isServerReady) {
            console.warn('Llama server process exists but is not ready yet. Waiting...');
            // Wait up to 5s for readiness
            let attempts = 0;
            while (!this.isServerReady && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (!this.isServerReady) {
                console.warn('Llama server timed out waiting for readiness. Proceeding anyway...');
            }
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

        // Auto-start if needed (lazy load)
        if (!this.serverProcess && this.settings.llamaBinaryPath) {
            await this.startServer();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (this.serverProcess && !this.isServerReady) {
            let attempts = 0;
            while (!this.isServerReady && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (!this.isServerReady) {
                console.warn('Llama server timed out waiting for readiness. Proceeding anyway...');
            }
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
        return `You are an AI assistant that classifies ideas into categories and tags.
Valid categories: game, saas, tool, story, mechanic, hardware, ip, brand, ux, personal.

Idea: "${text}"

Respond with valid JSON only.
Example:
{
  "category": "game",
  "tags": ["rpg", "fantasy"]
}

Response:
{`;
    }

    private parseResponse(content: string): ClassificationResult {
        try {
            // Ensure content starts with brace if model missed it (due to prompt ending with {)
            const jsonStr = content.trim().startsWith('{') ? content : `{${content}`;
            // Ensure it ends with brace if stop token cut it off
            const validJsonStr = jsonStr.trim().endsWith('}') ? jsonStr : `${jsonStr}}`;

            const parsed = JSON.parse(validJsonStr);

            return {
                category: this.validateCategory(parsed.category),
                tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
                confidence: 0.8 // Placeholder confidence
            };
        } catch (error) {
            console.warn('Failed to parse Llama response:', content, error);
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
