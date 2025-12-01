import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createWriteStream } from 'fs';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger';

/**
 * Model configuration
 */
export interface ModelConfig {
    key: string;
    name: string;
    badge: string;
    fileName: string;
    url: string;
    sizeBytes: number;
    sizeMB: number;
    ram: string;
    quality: number; // 1-5 rating
    speed: number; // 1-5 rating
    description: string;
    pros: string[];
    cons: string[];
    bestFor: string;
    chatTemplate: 'phi-3.5' | 'llama-3.1' | 'qwen-2.5';
}

/**
 * Model information (legacy, for backward compatibility)
 */
export interface ModelInfo {
    name: string;
    sizeBytes: number;
    sizeMB: number;
    checksum: string;
    downloadUrl: string;
}

/**
 * Available model configurations
 */
export const MODELS: Record<string, ModelConfig> = {
    // Tier 1: Default (Best for most)
    'phi-3.5-mini': {
        key: 'phi-3.5-mini',
        name: 'Phi-3.5 Mini',
        badge: 'EFFICIENT',
        fileName: 'Phi-3.5-mini-instruct-Q8_0.gguf',
        url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q8_0.gguf',
        sizeBytes: 4_360_000_000, // 4.06GB from bartowski repo
        sizeMB: 4060,
        ram: '6-8GB',
        quality: 4,
        speed: 5,
        description: 'Fast, lightweight, and ideal for everyday tasks. Excellent at structured work like classification and tagging.',
        pros: ['Fast', 'Accurate', 'Small download', 'Low RAM usage'],
        cons: ['Less creative than larger models'],
        bestFor: 'Most users',
        chatTemplate: 'phi-3.5'
    },

    // Tier 2: Step up (More quality)
    'qwen-2.5-7b': {
        key: 'qwen-2.5-7b',
        name: 'Qwen 2.5 7B',
        badge: 'VERSATILE',
        fileName: 'Qwen2.5-7B-Instruct-Q8_0.gguf',
        url: 'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q8_0.gguf',
        sizeBytes: 7_800_000_000,
        sizeMB: 7800,
        ram: '10GB',
        quality: 4.5,
        speed: 4,
        description: 'A well-rounded model with stronger reasoning. Great at handling more complex and multilingual tasks.',
        pros: ['Higher accuracy', 'Better context understanding', 'Multilingual'],
        cons: ['Larger download', 'More RAM needed'],
        bestFor: 'Users with 16GB+ RAM who want better quality',
        chatTemplate: 'qwen-2.5'
    },

    // Tier 3: Premium (Best quality, reasonable size)
    'llama-3.1-8b': {
        key: 'llama-3.1-8b',
        name: 'Llama 3.1 8B',
        badge: 'RELIABLE',
        fileName: 'Meta-Llama-3.1-8B-Instruct-Q8_0.gguf',
        url: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q8_0.gguf',
        sizeBytes: 8_500_000_000,
        sizeMB: 8500,
        ram: '10-12GB',
        quality: 4.5,
        speed: 3,
        description: 'Meta\'s trusted and widely documented model. Excellent accuracy with strong community support.',
        pros: ['Very accurate', 'Well-tested', 'Strong community'],
        cons: ['Larger download', 'Slower inference'],
        bestFor: 'Power users who want Meta\'s best',
        chatTemplate: 'llama-3.1'
    },

    // Tier 4: Maximum (For enthusiasts only)
    'llama-3.3-70b': {
        key: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        badge: 'PREMIUM',
        fileName: 'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
        url: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF/resolve/main/Llama-3.3-70B-Instruct-Q4_K_M.gguf',
        sizeBytes: 43_000_000_000,
        sizeMB: 43000,
        ram: '48GB+',
        quality: 5,
        speed: 1,
        description: 'Top-tier performance with near-GPT-4 quality. Requires a high-end desktop workstation.',
        pros: ['Best possible quality', 'Near-perfect accuracy', 'Understands complex nuance'],
        cons: ['Huge download (43GB)', 'Requires 64GB+ RAM', 'Very slow on most hardware'],
        bestFor: 'Desktop workstations with 64GB+ RAM',
        chatTemplate: 'llama-3.1'
    }
};


/**
 * Model Manager interface for managing AI model downloads
 */
export interface IModelManager {
    /**
     * Check if model is already downloaded
     */
    isModelDownloaded(): Promise<boolean>;

    /**
     * Get the path where model should be stored
     */
    getModelPath(): string;

    /**
     * Download model from Hugging Face
     * @param progressCallback - Optional callback for progress updates (0-100, downloadedMB, totalMB)
     * @param abortSignal - Optional AbortSignal for cancellation
     * @param overwrite - If true, overwrite existing model file
     */
    downloadModel(
        progressCallback?: (progress: number, downloadedMB: number, totalMB: number) => void,
        abortSignal?: AbortSignal,
        overwrite?: boolean
    ): Promise<void>;

    /**
     * Cancel ongoing download
     */
    cancelDownload(): void;

    /**
     * Verify model integrity using SHA-256 checksum
     */
    verifyModelIntegrity(): Promise<boolean>;

    /**
     * Get all available models
     */
    getAvailableModels(): Record<string, ModelConfig>;

    /**
     * Get model information (size, name, etc.)
     */
    getModelInfo(): ModelInfo;

    /**
     * Get model configuration
     */
    getModelConfig(): ModelConfig;

    /**
     * Check if a download is currently in progress
     */
    isDownloadInProgress(): boolean;

    /**
     * Get current download progress callback (for background tracking)
     */
    getDownloadProgressCallback(): ((progress: number, downloadedMB: number, totalMB: number) => void) | null;
}

/**
 * Model Manager implementation
 */
export class ModelManager implements IModelManager {
    private readonly modelConfig: ModelConfig;
    private readonly modelDir: string;
    private readonly modelPath: string;
    private readonly modelInfo: ModelInfo;
    private abortController: AbortController | null = null;
    private isDownloading: boolean = false;
    private downloadProgressCallback: ((progress: number, downloadedMB: number, totalMB: number) => void) | null = null;

    constructor(modelKey: string = 'phi-3.5-mini') {
        // Validate model key
        if (!MODELS[modelKey]) {
            Logger.warn(`Invalid model key: ${modelKey}, falling back to phi-3.5-mini`);
            modelKey = 'phi-3.5-mini';
        }

        this.modelConfig = MODELS[modelKey];

        // Store model in user home directory: ~/.ideatr/models/
        const homeDir = os.homedir();
        this.modelDir = path.join(homeDir, '.ideatr', 'models');
        this.modelPath = path.join(this.modelDir, this.modelConfig.fileName);

        // Model information (legacy format for backward compatibility)
        this.modelInfo = {
            name: this.modelConfig.fileName,
            sizeBytes: this.modelConfig.sizeBytes,
            sizeMB: this.modelConfig.sizeMB,
            checksum: '', // SHA-256 checksum - will be calculated or fetched from Hugging Face
            downloadUrl: this.modelConfig.url
        };
    }

    getModelPath(): string {
        return this.modelPath;
    }

    getModelInfo(): ModelInfo {
        return { ...this.modelInfo };
    }

    getModelConfig(): ModelConfig {
        return { ...this.modelConfig };
    }

    getAvailableModels(): Record<string, ModelConfig> {
        return MODELS;
    }

    async isModelDownloaded(): Promise<boolean> {
        try {
            await fs.access(this.modelPath);
            return true;
        } catch {
            return false;
        }
    }

    async downloadModel(
        progressCallback?: (progress: number, downloadedMB: number, totalMB: number) => void,
        abortSignal?: AbortSignal,
        overwrite: boolean = false
    ): Promise<void> {
        // Create model directory if it doesn't exist
        try {
            await fs.mkdir(this.modelDir, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create model directory: ${error}`);
        }

        // Check if model already exists
        if (await this.isModelDownloaded() && !overwrite) {
            throw new Error('Model already downloaded');
        }

        // If overwriting, remove existing file
        if (overwrite && await this.isModelDownloaded()) {
            try {
                await fs.unlink(this.modelPath);
            } catch (error) {
                throw new Error(`Failed to remove existing model: ${error}`);
            }
        }

        // Track download state
        this.isDownloading = true;
        this.downloadProgressCallback = progressCallback || null;

        // Use provided abort signal
        if (abortSignal) {
            // Signal is available for cancellation if needed
        }
        if (!abortSignal) {
            this.abortController = new AbortController();
        }

        const actualSignal = abortSignal || this.abortController!.signal;

        try {
            // Start download
            const response = await fetch(this.modelInfo.downloadUrl, {
                signal: actualSignal,
                headers: {
                    'Accept': 'application/octet-stream',
                    'User-Agent': 'Obsidian-IdeaTr/1.0 (Model Downloader)'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Extract model page URL from download URL
                    // URL format: https://huggingface.co/{org}/{repo}/resolve/main/{filename}
                    // Model page: https://huggingface.co/{org}/{repo}
                    const urlMatch = this.modelInfo.downloadUrl.match(/^https:\/\/huggingface\.co\/([^\/]+\/[^\/]+)\//);
                    const modelPageUrl = urlMatch 
                        ? `https://huggingface.co/${urlMatch[1]}`
                        : 'https://huggingface.co';
                    
                    throw new Error(
                        `Download failed: Authentication required (401). ` +
                        `This model may require accepting terms on Hugging Face. ` +
                        `Please visit ${modelPageUrl} to accept any required agreements, then try again.`
                    );
                }
                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }

            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : this.modelInfo.sizeBytes;
            const totalMB = totalBytes / (1024 * 1024);

            // Update modelInfo with actual size from server if available
            if (contentLength) {
                this.modelInfo.sizeBytes = totalBytes;
                this.modelInfo.sizeMB = totalMB;
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            // Create write stream
            const writeStream = createWriteStream(this.modelPath);
            let downloadedBytes = 0;

            // Read chunks and write to file
            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    if (actualSignal.aborted) {
                        throw new Error('Download cancelled');
                    }

                    // Write chunk to file
                    await new Promise<void>((resolve, reject) => {
                        writeStream.write(Buffer.from(value), (error) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });

                    downloadedBytes += value.length;
                    const downloadedMB = downloadedBytes / (1024 * 1024);
                    const progress = (downloadedBytes / totalBytes) * 100;

                    if (progressCallback) {
                        progressCallback(progress, downloadedMB, totalMB);
                    }
                }

                // Close write stream
                await new Promise<void>((resolve, reject) => {
                    writeStream.end((error: Error | null) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });

                // Verify downloaded size matches expected size
                if (downloadedBytes !== totalBytes) {
                    throw new Error(`Download incomplete: expected ${totalBytes} bytes, got ${downloadedBytes} bytes`);
                }
            } catch (error) {
                writeStream.destroy();
                // Clean up partial download
                try {
                    await fs.unlink(this.modelPath);
                } catch {
                    // Ignore cleanup errors
                }
                throw error;
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Clean up partial download on cancellation
                try {
                    await fs.unlink(this.modelPath);
                } catch {
                    // Ignore cleanup errors
                }
                throw new Error('Download cancelled');
            }
            throw error;
            } finally {
            this.isDownloading = false;
            this.downloadProgressCallback = null;
            if (!abortSignal) {
                this.abortController = null;
            }
        }
    }

    /**
     * Check if a download is currently in progress
     */
    isDownloadInProgress(): boolean {
        return this.isDownloading;
    }

    /**
     * Get current download progress callback (for background tracking)
     */
    getDownloadProgressCallback(): ((progress: number, downloadedMB: number, totalMB: number) => void) | null {
        return this.downloadProgressCallback;
    }

    cancelDownload(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    async verifyModelIntegrity(): Promise<boolean> {
        try {
            if (!(await this.isModelDownloaded())) {
                return false;
            }

            // First, check file size matches expected size (quick check)
            const stats = await fs.stat(this.modelPath);
            const actualSizeBytes = stats.size;
            const actualSizeMB = actualSizeBytes / (1024 * 1024);

            // Allow 1% tolerance for file size differences (more strict than before)
            const expectedSizeBytes = this.modelInfo.sizeBytes;
            const expectedSizeMB = this.modelInfo.sizeMB;
            const toleranceBytes = expectedSizeBytes * 0.01;
            const toleranceMB = expectedSizeMB * 0.01;

            const sizeDifference = Math.abs(actualSizeBytes - expectedSizeBytes);
            const sizeMatches = sizeDifference <= toleranceBytes;

            // If checksum is provided, verify SHA-256 checksum
            if (this.modelInfo.checksum && this.modelInfo.checksum.trim().length > 0) {
                // Calculate SHA-256 hash of the file
                const fileBuffer = await fs.readFile(this.modelPath);
                const hash = createHash('sha256');
                hash.update(fileBuffer);
                const calculatedChecksum = hash.digest('hex');

                // Compare checksums (case-insensitive)
                const checksumMatches = calculatedChecksum.toLowerCase() === this.modelInfo.checksum.toLowerCase();

                if (!sizeMatches || !checksumMatches) {
                    Logger.warn('Model integrity check failed:', {
                        expectedSizeBytes,
                        actualSizeBytes,
                        sizeDifference,
                        sizeMatches,
                        checksumMatches
                    });
                }

                return sizeMatches && checksumMatches;
            }

            // If no checksum provided, fall back to size check only
            if (!sizeMatches) {
                Logger.warn('Model integrity check failed - size mismatch:', {
                    expectedSizeMB: expectedSizeMB.toFixed(2),
                    actualSizeMB: actualSizeMB.toFixed(2),
                    differenceMB: (actualSizeMB - expectedSizeMB).toFixed(2),
                    toleranceMB: toleranceMB.toFixed(2)
                });
            }

            return sizeMatches;
        } catch (error) {
            console.error('Model integrity check error:', error);
            return false;
        }
    }
}

