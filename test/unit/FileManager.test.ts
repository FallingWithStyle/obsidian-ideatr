import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileManager } from '../../src/storage/FileManager';
import type { Vault, TFile } from 'obsidian';

// Mock Vault API
function createMockVault(): Vault {
    const files = new Map<string, unknown>();

    return {
        getAbstractFileByPath: vi.fn((path: string) => {
            return files.get(path) || null;
        }),
        createFolder: vi.fn(async (path: string) => {
            files.set(path, { type: 'folder', path });
            return { path } as unknown as any;
        }),
        create: vi.fn(async (path: string, content: string) => {
            const file = { path, content, stat: { mtime: Date.now() } };
            files.set(path, file);
            return file as unknown as TFile;
        })
    } as unknown as Vault;
}

describe('FileManager', () => {
    let vault: Vault;
    let fileManager: FileManager;

    beforeEach(() => {
        vault = createMockVault();
        fileManager = new FileManager(vault);
    });

    describe('ensureIdeasDirectory', () => {
        it('should create Ideas directory if it does not exist', async () => {
            await fileManager.ensureIdeasDirectory();
            expect(vault.createFolder).toHaveBeenCalledWith('Ideas');
        });

        it('should not create Ideas directory if it already exists', async () => {
            // Simulate existing directory
            vi.mocked(vault.getAbstractFileByPath).mockReturnValueOnce({ path: 'Ideas' } as any);

            await fileManager.ensureIdeasDirectory();
            expect(vault.createFolder).not.toHaveBeenCalled();
        });
    });

    describe('createIdeaFile', () => {
        it('should create file with correct path', async () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };

            await fileManager.createIdeaFile(idea);

            expect(vault.create).toHaveBeenCalledWith(
                'Ideas/2025-11-28-test-idea.md',
                expect.any(String)
            );
        });

        it('should create file with frontmatter and body', async () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };

            await fileManager.createIdeaFile(idea);

            const createCall = vi.mocked(vault.create).mock.calls[0];
            const content = createCall[1];

            expect(content).toContain('---');
            expect(content).toContain('type: idea');
            expect(content).toContain('status: captured');
            expect(content).toContain('created: 2025-11-28');
            expect(content).toContain('Test idea');
        });

        it('should ensure Ideas directory exists before creating file', async () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };

            await fileManager.createIdeaFile(idea);

            expect(vault.createFolder).toHaveBeenCalled();
        });

        it('should return created file', async () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };

            const file = await fileManager.createIdeaFile(idea);

            expect(file).toBeDefined();
            expect(file.path).toBe('Ideas/2025-11-28-test-idea.md');
        });

        it('should handle filename collisions with suffix', async () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };

            // Simulate existing file
            vi.mocked(vault.getAbstractFileByPath)
                .mockReturnValueOnce(null) // Directory check
                .mockReturnValueOnce({ path: 'Ideas/2025-11-28-test-idea.md' } as any) // First collision check
                .mockReturnValueOnce(null); // Second collision check (no collision)

            await fileManager.createIdeaFile(idea);

            expect(vault.create).toHaveBeenCalledWith(
                'Ideas/2025-11-28-test-idea-2.md',
                expect.any(String)
            );
        });

        it('should handle multiple collisions', async () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };

            // Simulate multiple existing files
            vi.mocked(vault.getAbstractFileByPath)
                .mockReturnValueOnce(null) // Directory check
                .mockReturnValueOnce({ path: 'Ideas/2025-11-28-test-idea.md' } as any)
                .mockReturnValueOnce({ path: 'Ideas/2025-11-28-test-idea-2.md' } as any)
                .mockReturnValueOnce({ path: 'Ideas/2025-11-28-test-idea-3.md' } as any)
                .mockReturnValueOnce(null);

            await fileManager.createIdeaFile(idea);

            expect(vault.create).toHaveBeenCalledWith(
                'Ideas/2025-11-28-test-idea-4.md',
                expect.any(String)
            );
        });
    });

    describe('fileExists', () => {
        it('should return true if file exists', () => {
            vi.mocked(vault.getAbstractFileByPath).mockReturnValueOnce({ path: 'test.md' } as any);

            expect(fileManager.fileExists('test.md')).toBe(true);
        });

        it('should return false if file does not exist', () => {
            vi.mocked(vault.getAbstractFileByPath).mockReturnValueOnce(null);

            expect(fileManager.fileExists('test.md')).toBe(false);
        });
    });
});
