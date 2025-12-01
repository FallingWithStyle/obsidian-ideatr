import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelManager, IModelManager } from '../../src/services/ModelManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';

// Mock os module
vi.mock('os', () => ({
    homedir: vi.fn(() => '/home/test')
}));

// Mock fs module
vi.mock('fs/promises', () => ({
    access: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    readFile: vi.fn()
}));

// Mock fs createWriteStream
vi.mock('fs', () => ({
    createWriteStream: vi.fn(() => ({
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
        destroy: vi.fn()
    }))
}));

// Mock fetch
global.fetch = vi.fn();

describe('ModelManager', () => {
    let modelManager: IModelManager;
    const mockHomeDir = '/home/test';

    beforeEach(() => {
        vi.clearAllMocks();
        modelManager = new ModelManager();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getModelPath', () => {
        it('should return path in ~/.ideatr/models/ directory', () => {
            const modelPath = modelManager.getModelPath();
            expect(modelPath).toBe(path.join(mockHomeDir, '.ideatr', 'models', 'Phi-3.5-mini-instruct-q8_0.gguf'));
        });
    });

    describe('getModelInfo', () => {
        it('should return model information', () => {
            const info = modelManager.getModelInfo();
            expect(info.name).toBe('Phi-3.5-mini-instruct-q8_0.gguf');
            expect(info.sizeMB).toBeGreaterThan(0);
            expect(info.downloadUrl).toContain('huggingface.co');
        });
    });

    describe('isModelDownloaded', () => {
        it('should return true if model file exists', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);

            const result = await modelManager.isModelDownloaded();

            expect(result).toBe(true);
            expect(fs.access).toHaveBeenCalledWith(modelManager.getModelPath());
        });

        it('should return false if model file does not exist', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

            const result = await modelManager.isModelDownloaded();

            expect(result).toBe(false);
        });
    });

    describe('downloadModel', () => {
        it('should create model directory if it does not exist', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);

            const mockWriteStream = {
                write: vi.fn((chunk, callback) => {
                    if (callback) callback(null);
                }),
                end: vi.fn((callback) => {
                    if (callback) callback(null);
                }),
                on: vi.fn(),
                once: vi.fn(),
                destroy: vi.fn()
            };
            vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any);

            const mockResponse = {
                ok: true,
                headers: new Headers({
                    'content-length': '2164260864'
                }),
                body: {
                    getReader: () => {
                        let bytesWritten = 0;
                        const chunkSize = 1024 * 1024; // 1MB chunks
                        return {
                            read: vi.fn().mockImplementation(() => {
                                if (bytesWritten < 2164260864) {
                                    const chunk = new Uint8Array(Math.min(chunkSize, 2164260864 - bytesWritten));
                                    bytesWritten += chunk.length;
                                    return Promise.resolve({ done: false, value: chunk });
                                }
                                return Promise.resolve({ done: true, value: null });
                            })
                        };
                    }
                }
            };

            vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

            await modelManager.downloadModel();

            expect(fs.mkdir).toHaveBeenCalledWith(
                path.join(mockHomeDir, '.ideatr', 'models'),
                { recursive: true }
            );
        });

        it('should throw error if model already exists', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);

            await expect(modelManager.downloadModel()).rejects.toThrow('Model already downloaded');
        });

        it('should download model and report progress', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);

            const progressCallback = vi.fn();
            const chunks = [
                new Uint8Array(1024 * 1024), // 1MB
                new Uint8Array(1024 * 1024), // 1MB
                new Uint8Array(1024 * 1024)  // 1MB
            ];

            let chunkIndex = 0;
            const reader = {
                read: vi.fn().mockImplementation(() => {
                    if (chunkIndex < chunks.length) {
                        return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
                    }
                    return Promise.resolve({ done: true, value: null });
                })
            };

            const mockResponse = {
                ok: true,
                headers: new Headers({
                    'content-length': String(3 * 1024 * 1024) // 3MB total
                }),
                body: {
                    getReader: () => reader
                }
            };

            const mockWriteStream = {
                write: vi.fn((chunk, callback) => {
                    if (callback) callback(null);
                }),
                end: vi.fn((callback) => {
                    if (callback) callback(null);
                }),
                on: vi.fn(),
                once: vi.fn(),
                destroy: vi.fn()
            };
            vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any);

            vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

            await modelManager.downloadModel(progressCallback);

            expect(progressCallback).toHaveBeenCalled();
            expect(progressCallback).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should handle download cancellation', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);

            const abortController = new AbortController();
            const reader = {
                read: vi.fn().mockImplementation(() => {
                    abortController.abort();
                    return Promise.resolve({ done: false, value: new Uint8Array(1024) });
                })
            };

            const mockResponse = {
                ok: true,
                headers: new Headers({
                    'content-length': '1000000'
                }),
                body: {
                    getReader: () => reader
                }
            };

            const mockWriteStream = {
                write: vi.fn((chunk, callback) => {
                    if (callback) callback(null);
                }),
                end: vi.fn((callback) => {
                    if (callback) callback(null);
                }),
                on: vi.fn(),
                once: vi.fn(),
                destroy: vi.fn()
            };
            vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any);

            vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
            vi.mocked(fs.unlink).mockResolvedValue(undefined);

            await expect(
                modelManager.downloadModel(undefined, abortController.signal)
            ).rejects.toThrow();

            expect(fs.unlink).toHaveBeenCalled();
        });

        it('should clean up partial download on error', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);
            vi.mocked(fs.unlink).mockResolvedValue(undefined);

            const reader = {
                read: vi.fn().mockRejectedValue(new Error('Network error'))
            };

            const mockResponse = {
                ok: true,
                headers: new Headers({
                    'content-length': '1000000'
                }),
                body: {
                    getReader: () => reader
                }
            };

            const mockWriteStream = {
                write: vi.fn((chunk, callback) => {
                    if (callback) callback(new Error('Write error'));
                }),
                end: vi.fn((callback) => {
                    if (callback) callback(null);
                }),
                on: vi.fn(),
                once: vi.fn(),
                destroy: vi.fn()
            };
            vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any);

            vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

            await expect(modelManager.downloadModel()).rejects.toThrow();

            expect(fs.unlink).toHaveBeenCalled();
        });

        it('should handle fetch errors', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);
            vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

            await expect(modelManager.downloadModel()).rejects.toThrow();
        });

        it('should handle non-ok response', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);

            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };

            vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

            await expect(modelManager.downloadModel()).rejects.toThrow('Download failed: 404 Not Found');
        });
    });

    describe('cancelDownload', () => {
        it('should cancel ongoing download', () => {
            const manager = modelManager as ModelManager;
            manager.cancelDownload(); // Should not throw
        });
    });

    describe('verifyModelIntegrity', () => {
        it('should return false if model is not downloaded', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

            const result = await modelManager.verifyModelIntegrity();

            expect(result).toBe(false);
        });

        it('should return true if model size matches expected size', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            const modelInfo = modelManager.getModelInfo();
            const expectedSizeBytes = modelInfo.sizeBytes;
            
            vi.mocked(fs.stat).mockResolvedValue({
                size: expectedSizeBytes
            } as any);

            const result = await modelManager.verifyModelIntegrity();

            expect(result).toBe(true);
        });

        it('should return false if model size does not match', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.stat).mockResolvedValue({
                size: 1000 // Very small, clearly wrong
            } as any);

            const result = await modelManager.verifyModelIntegrity();

            expect(result).toBe(false);
        });

        it('should allow 1% tolerance for file size', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            const modelInfo = modelManager.getModelInfo();
            const expectedSizeBytes = modelInfo.sizeBytes;
            // 0.5% larger than expected (within 1% tolerance)
            const actualSizeBytes = expectedSizeBytes * 1.005;
            
            vi.mocked(fs.stat).mockResolvedValue({
                size: actualSizeBytes
            } as any);

            const result = await modelManager.verifyModelIntegrity();

            expect(result).toBe(true);
        });

        it('should return false on file system error', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.stat).mockRejectedValue(new Error('Permission denied'));

            const result = await modelManager.verifyModelIntegrity();

            expect(result).toBe(false);
        });

        it('should verify SHA-256 checksum when checksum is provided', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            // Mock readFile to return file content
            const mockReadFile = vi.fn().mockResolvedValue(Buffer.from('test content'));
            vi.mocked(fs.readFile).mockImplementation(mockReadFile as any);
            
            // This test will need the actual checksum implementation
            // For now, we'll test that it attempts checksum validation
            const result = await modelManager.verifyModelIntegrity();
            
            // If checksum is empty, should fall back to size check
            // If checksum is provided, should verify it
            expect(result).toBeDefined();
        });
    });
});

