import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { Logger } from './logger';

export interface ProcessOptions extends SpawnOptions {
    maxBufferLines?: number;
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
    onClose?: (code: number | null, signal: NodeJS.Signals | null) => void;
    onError?: (error: Error) => void;
}

/**
 * Manages a child process with robust event listener handling and cleanup
 */
export class ProcessManager {
    private process: ChildProcess | null = null;
    private options: ProcessOptions;
    private stdoutBuffer: string[] = [];
    private stderrBuffer: string[] = [];
    private maxBufferLines: number;

    constructor(options: ProcessOptions = {}) {
        this.options = options;
        this.maxBufferLines = options.maxBufferLines || 1000;
    }

    /**
     * Start a new process
     */
    start(command: string, args: string[]): ChildProcess {
        if (this.process) {
            throw new Error('Process already running');
        }

        Logger.debug(`Starting process: ${command} ${args.join(' ')}`);

        // Ensure process is NOT detached to prevent orphaning
        // When detached: false, child dies when parent exits
        const spawnOptions: SpawnOptions = {
            ...this.options,
            detached: false,  // Critical: prevents PPID=1 orphans
            stdio: 'pipe'     // Ensure we can capture stdout/stderr
        };

        this.process = spawn(command, args, spawnOptions);

        this.setupListeners();

        return this.process;
    }

    /**
     * Stop the process gracefully
     */
    async stop(signal: NodeJS.Signals = 'SIGTERM', timeoutMs: number = 2000): Promise<void> {
        if (!this.process) {
            return;
        }

        return new Promise((resolve) => {
            if (!this.process) {
                resolve();
                return;
            }

            const pid = this.process.pid;
            Logger.debug(`Stopping process ${pid} with ${signal}`);

            // Set up a timeout to force kill
            const timeout = setTimeout(() => {
                if (this.process) {
                    Logger.warn(`Process ${pid} did not exit in ${timeoutMs}ms, force killing`);
                    try {
                        this.process.kill('SIGKILL');
                    } catch (e) {
                        Logger.debug('Error force killing:', e);
                    }
                }
                resolve();
            }, timeoutMs);

            // Listen for exit
            this.process.once('exit', () => {
                clearTimeout(timeout);
                Logger.debug(`Process ${pid} exited`);
                resolve();
            });

            // Send signal
            try {
                this.process.kill(signal);
            } catch (e) {
                Logger.debug('Error sending signal:', e);
                clearTimeout(timeout);
                resolve();
            }
        });
    }

    /**
     * Get the underlying child process
     */
    getProcess(): ChildProcess | null {
        return this.process;
    }

    /**
     * Check if the process is currently running
     */
    isRunning(): boolean {
        return this.process !== null && this.process.exitCode === null;
    }

    /**
     * Get buffered stdout
     */
    getStdout(): string[] {
        return [...this.stdoutBuffer];
    }

    /**
     * Get buffered stderr
     */
    getStderr(): string[] {
        return [...this.stderrBuffer];
    }

    /**
     * Clear buffers
     */
    clearBuffers(): void {
        this.stdoutBuffer = [];
        this.stderrBuffer = [];
    }

    private setupListeners() {
        if (!this.process) return;

        this.process.stdout?.on('data', (data) => {
            const str = data.toString();
            this.addToBuffer(this.stdoutBuffer, str);
            this.options.onStdout?.(str);
        });

        this.process.stderr?.on('data', (data) => {
            const str = data.toString();
            this.addToBuffer(this.stderrBuffer, str);
            this.options.onStderr?.(str);
        });

        this.process.on('close', (code, signal) => {
            Logger.debug(`Process closed with code ${code} and signal ${signal}`);
            this.process = null;
            this.options.onClose?.(code, signal);
        });

        this.process.on('error', (err) => {
            Logger.error('Process error:', err);
            this.options.onError?.(err);
        });
    }

    private addToBuffer(buffer: string[], data: string) {
        const lines = data.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                buffer.push(line);
            }
        }

        // Trim buffer if needed
        if (buffer.length > this.maxBufferLines) {
            buffer.splice(0, buffer.length - this.maxBufferLines);
        }
    }
}
