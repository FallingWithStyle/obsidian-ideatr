import * as fs from 'fs/promises';
import { joinPath } from '../utils/pathUtils';
import { getHomeDir } from '../utils/platformUtils';
import { createWriteStream, createReadStream } from 'fs';
// Note: crypto.createHash replaced with Web Crypto API (crypto.subtle.digest)
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
    sha256?: string; // SHA-256 checksum for integrity verification
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
 * 
 * Note: SHA256 checksums can be added to the sha256 field for each model.
 * To calculate a checksum for a downloaded model, use ModelManager.calculateModelChecksum()
 * Checksums provide the most reliable integrity verification.
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
        chatTemplate: 'phi-3.5',
        sha256: '76fbf02f6fe92af57dbd818409bc8a0240026f1f3609bb405c3be94c973fb823'
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
        chatTemplate: 'qwen-2.5',
        sha256: '9c6a6e61664446321d9c0dd7ee28a0d03914277609e21bc0e1fce4abe780ce1b'
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
        chatTemplate: 'llama-3.1',
        sha256: '9da71c45c90a821809821244d4971e5e5dfad7eb091f0b8ff0546392393b6283'
    },

    // Tier 4: Maximum (For enthusiasts only)
    'llama-3.3-70b': {
        key: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        badge: 'MAXIMUM',
        fileName: 'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
        url: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF/resolve/main/Llama-3.3-70B-Instruct-Q4_K_M.gguf',
        sizeBytes: 42_500_000_000, // Q4_K_M quantization is approximately 42.5GB
        sizeMB: 42500,
        ram: '48GB+',
        quality: 5,
        speed: 1,
        description: 'Top-tier performance with near-GPT-4 quality. Requires a high-end desktop workstation or powerful laptop with substantial RAM.',
        pros: [
            'Best possible quality',
            'Near-perfect accuracy',
            'Understands complex nuance'
        ],
        cons: [
            'Huge download (~42.5GB)',
            'Requires 48GB+ RAM',
            'Very slow on most hardware'
        ],
        bestFor: 'Desktop workstations with 64GB+ RAM',
        chatTemplate: 'llama-3.1',
        sha256: '32df3baccb556f9840059b2528b2dee4d3d516b24afdfb9d0c56ff5f63e3a664'
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
    private activeHashOperations: number = 0; // Track concurrent hash operations
    private hashOperationLock: Promise<void> = Promise.resolve(); // Serialize hash operations

    constructor(modelKey: string = 'phi-3.5-mini') {
        // Validate model key
        if (!MODELS[modelKey]) {
            Logger.warn(`Invalid model key: ${modelKey}, falling back to phi-3.5-mini`);
            modelKey = 'phi-3.5-mini';
        }

        this.modelConfig = MODELS[modelKey];

        // Store model in user home directory: ~/.ideatr/models/
        // Note: getHomeDir() may throw if not available - consider using vault paths instead
        try {
            const homeDir = getHomeDir();
            this.modelDir = joinPath(homeDir, '.ideatr', 'models');
            this.modelPath = joinPath(this.modelDir, this.modelConfig.fileName);
        } catch (error) {
            // Fallback: use a relative path or configDir-based path
            // For now, we'll use a simple fallback - this might need adjustment based on requirements
            Logger.warn('Home directory not available, using fallback path:', error);
            this.modelDir = '.ideatr/models';
            this.modelPath = joinPath(this.modelDir, this.modelConfig.fileName);
        }

        // Model information (legacy format for backward compatibility)
        this.modelInfo = {
            name: this.modelConfig.fileName,
            sizeBytes: this.modelConfig.sizeBytes,
            sizeMB: this.modelConfig.sizeMB,
            checksum: this.modelConfig.sha256 || '', // SHA-256 checksum from config
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

            // Check file size is within reasonable range
            const stats = await fs.stat(this.modelPath);
            const actualSizeBytes = stats.size;
            const actualSizeMB = actualSizeBytes / (1024 * 1024);

            // File must not be empty
            if (actualSizeBytes === 0) {
                Logger.warn('Model integrity check failed - file is empty');
                return false;
            }

            const expectedSizeBytes = this.modelInfo.sizeBytes;
            const expectedSizeMB = this.modelInfo.sizeMB;

            // Allow 20% tolerance on either side (80% to 120% of expected size)
            // This accounts for variations in actual file sizes from Hugging Face
            const minSizeBytes = expectedSizeBytes * 0.8;
            const maxSizeBytes = expectedSizeBytes * 1.2;
            const sizeInRange = actualSizeBytes >= minSizeBytes && actualSizeBytes <= maxSizeBytes;

            // If checksum is provided, SHA-256 checksum verification is the primary method
            if (this.modelInfo.checksum && this.modelInfo.checksum.trim().length > 0) {
                // Serialize hash operations to prevent concurrent streams on the same file
                await this.hashOperationLock;
                
                // Create a new lock for the next operation
                let lockResolver!: () => void;
                this.hashOperationLock = new Promise<void>((resolve) => {
                    lockResolver = resolve;
                });

                try {
                    // Calculate SHA-256 hash of the file using streaming for large files
                    const calculatedChecksum = await new Promise<string>((resolve, reject) => {
                        // Track active hash operations for debugging
                        this.activeHashOperations++;
                        const beforeMemory = process.memoryUsage().rss;
                        
                        Logger.debug('HASH START', this.modelPath, 'Active:', this.activeHashOperations);
                        
                        // Read file in chunks and accumulate for hashing
                        // Note: Web Crypto API doesn't support incremental hashing, so we accumulate chunks
                        const chunks: Uint8Array[] = [];
                        const stream = createReadStream(this.modelPath);
                        
                        // Ensure stream is destroyed on any error
                        const cleanup = () => {
                            if (!stream.destroyed) {
                                stream.destroy();
                            }
                            this.activeHashOperations--;
                            const afterMemory = typeof process !== 'undefined' ? process.memoryUsage().rss : 0;
                            Logger.debug('HASH END', this.modelPath, 'Active:', this.activeHashOperations, 
                                'Memory delta:', beforeMemory > 0 ? ((afterMemory - beforeMemory) / 1024 / 1024).toFixed(2) : 'N/A', 'MB');
                            // Release lock for next operation
                            lockResolver();
                        };
                        
                        stream.on('data', (data: Buffer) => {
                            chunks.push(new Uint8Array(data));
                        });
                        stream.on('end', async () => {
                            try {
                                // Concatenate all chunks
                                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                                const combined = new Uint8Array(totalLength);
                                let position = 0;
                                for (const chunk of chunks) {
                                    combined.set(chunk, position);
                                    position += chunk.length;
                                }
                                
                                // Calculate hash using Web Crypto API
                                const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
                                const hashArray = Array.from(new Uint8Array(hashBuffer));
                                const result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
                                
                                cleanup();
                                resolve(result);
                            } catch (error) {
                                cleanup();
                                reject(error);
                            }
                        });
                        stream.on('error', (error) => {
                            cleanup();
                            reject(error);
                        });
                        stream.on('close', () => {
                            // Stream closed - ensure cleanup if not already done
                            if (this.activeHashOperations > 0) {
                                this.activeHashOperations--;
                            }
                        });
                    });
                    
                    const expectedChecksum = this.modelInfo.checksum.toLowerCase().trim();

                    // Compare checksums (case-insensitive)
                    const checksumMatches = calculatedChecksum === expectedChecksum;

                    if (!checksumMatches) {
                        Logger.warn('Model integrity check failed - SHA256 checksum mismatch:', {
                            expected: expectedChecksum.substring(0, 16) + '...',
                            calculated: calculatedChecksum.substring(0, 16) + '...',
                            sizeInRange,
                            modelPath: this.modelPath
                        });
                        return false; // Checksum mismatch is a hard failure
                    }

                    // Checksum matches - also verify size is reasonable as secondary check
                    if (!sizeInRange) {
                        Logger.warn('Model integrity check - checksum matches but size outside expected range:', {
                            expectedSizeMB: expectedSizeMB.toFixed(2),
                            actualSizeMB: actualSizeMB.toFixed(2)
                        });
                        // Still return true since checksum matches (size might vary slightly)
                    }

                    return true; // Checksum verification passed
                } catch (error) {
                    // Release lock even on error
                    lockResolver();
                    throw error;
                }
            }

            // If no checksum provided, fall back to size range check only
            // This is less secure but allows verification when checksums aren't available
            if (!sizeInRange) {
                Logger.warn('Model integrity check - size outside expected range (no checksum available):', {
                    expectedSizeMB: expectedSizeMB.toFixed(2),
                    actualSizeMB: actualSizeMB.toFixed(2),
                    minSizeMB: (minSizeBytes / (1024 * 1024)).toFixed(2),
                    maxSizeMB: (maxSizeBytes / (1024 * 1024)).toFixed(2)
                });
            }

            return sizeInRange;
        } catch (error) {
            console.error('Model integrity check error:', error);
            return false;
        }
    }

    /**
     * Calculate SHA-256 checksum of the downloaded model file
     * Useful for generating checksums to add to model configs
     * Uses streaming to handle large files efficiently
     */
    async calculateModelChecksum(): Promise<string | null> {
        try {
            if (!(await this.isModelDownloaded())) {
                return null;
            }

            // Serialize hash operations to prevent concurrent streams on the same file
            await this.hashOperationLock;
            
            // Create a new lock for the next operation
            let lockResolver!: () => void;
            this.hashOperationLock = new Promise<void>((resolve) => {
                lockResolver = resolve;
            });

            try {
                return await new Promise<string>((resolve, reject) => {
                    // Track active hash operations for debugging
                    this.activeHashOperations++;
                    const beforeMemory = typeof process !== 'undefined' ? process.memoryUsage().rss : 0;
                    
                    Logger.debug('HASH START', this.modelPath, 'Active:', this.activeHashOperations);
                    
                    // Read file in chunks and accumulate for hashing
                    const chunks: Uint8Array[] = [];
                    const stream = createReadStream(this.modelPath);
                    
                    // Ensure stream is destroyed on any error
                    const cleanup = () => {
                        if (!stream.destroyed) {
                            stream.destroy();
                        }
                        this.activeHashOperations--;
                        const afterMemory = typeof process !== 'undefined' ? process.memoryUsage().rss : 0;
                        Logger.debug('HASH END', this.modelPath, 'Active:', this.activeHashOperations,
                            'Memory delta:', beforeMemory > 0 ? ((afterMemory - beforeMemory) / 1024 / 1024).toFixed(2) : 'N/A', 'MB');
                        // Release lock for next operation
                        lockResolver();
                    };
                    
                    stream.on('data', (data: Buffer) => {
                        chunks.push(new Uint8Array(data));
                    });
                    stream.on('end', async () => {
                        try {
                            // Concatenate all chunks
                            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                            const combined = new Uint8Array(totalLength);
                            let position = 0;
                            for (const chunk of chunks) {
                                combined.set(chunk, position);
                                position += chunk.length;
                            }
                            
                            // Calculate hash using Web Crypto API
                            const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
                            const hashArray = Array.from(new Uint8Array(hashBuffer));
                            const result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                            
                            cleanup();
                            resolve(result);
                        } catch (error) {
                            cleanup();
                            reject(error);
                        }
                    });
                    stream.on('error', (error) => {
                        cleanup();
                        reject(error);
                    });
                    stream.on('close', () => {
                        // Stream closed - ensure cleanup if not already done
                        if (this.activeHashOperations > 0) {
                            this.activeHashOperations--;
                        }
                    });
                });
            } catch (error) {
                // Release lock even on error
                lockResolver();
                throw error;
            }
        } catch (error) {
            Logger.error('Failed to calculate model checksum:', error);
            return null;
        }
    }
}

