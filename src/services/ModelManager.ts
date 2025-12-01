import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createWriteStream } from 'fs';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger';

/**
 * Model information
 */
export interface ModelInfo {
    name: string;
    sizeBytes: number;
    sizeMB: number;
    checksum: string;
    downloadUrl: string;
}

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
     */
    downloadModel(
        progressCallback?: (progress: number, downloadedMB: number, totalMB: number) => void,
        abortSignal?: AbortSignal
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
     * Get model information (size, name, etc.)
     */
    getModelInfo(): ModelInfo;
}

/**
 * Model Manager implementation
 */
export class ModelManager implements IModelManager {
    // Model name matches the actual filename in the download URL
    private readonly modelName = 'Llama-3.2-3B-Instruct-Q4_K_M.gguf';
    private readonly modelDir: string;
    private readonly modelPath: string;
    private readonly modelInfo: ModelInfo;
    private abortController: AbortController | null = null;

    constructor() {
        // Store model in user home directory: ~/.ideatr/models/
        const homeDir = os.homedir();
        this.modelDir = path.join(homeDir, '.ideatr', 'models');
        this.modelPath = path.join(this.modelDir, this.modelName);
        
        // Model information - Llama 3.2 3B Q4_K_M
        // Note: These values should match the actual Hugging Face model
        // SHA-256 checksum for Llama-3.2-3B-Instruct-Q4_K_M.gguf (will be verified after download)
        // For now, checksum is empty - will be calculated or fetched from Hugging Face
        this.modelInfo = {
            name: this.modelName,
            sizeBytes: 2164260864, // ~2.02GB in bytes (2.02 * 1024 * 1024 * 1024)
            sizeMB: 2064, // ~2.02GB
            checksum: '', // SHA-256 checksum - will be calculated or fetched from Hugging Face
            downloadUrl: `https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf`
        };
    }

    getModelPath(): string {
        return this.modelPath;
    }

    getModelInfo(): ModelInfo {
        return { ...this.modelInfo };
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
        abortSignal?: AbortSignal
    ): Promise<void> {
        // Create model directory if it doesn't exist
        try {
            await fs.mkdir(this.modelDir, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create model directory: ${error}`);
        }

        // Check if model already exists
        if (await this.isModelDownloaded()) {
            throw new Error('Model already downloaded');
        }

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
                    'Accept': 'application/octet-stream'
                }
            });

            if (!response.ok) {
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
            if (!abortSignal) {
                this.abortController = null;
            }
        }
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

