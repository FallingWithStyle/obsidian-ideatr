import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileManager } from '../../src/storage/FileManager';
import type { Vault, TFile } from 'obsidian';

// Mock Vault API with process method
function createMockVault(): Vault {
    const files = new Map<string, string>();
    
    return {
        getAbstractFileByPath: vi.fn((path: string) => {
            return files.has(path) ? { path } as TFile : null;
        }),
        createFolder: vi.fn(async (path: string) => {
            files.set(path, '');
        }),
        create: vi.fn(async (path: string, content: string) => {
            files.set(path, content);
            return { path } as unknown as TFile;
        }),
        read: vi.fn(async (file: TFile) => {
            return files.get(file.path) || '';
        }),
        process: vi.fn(async (file: TFile, processor: (content: string) => string) => {
            const currentContent = files.get(file.path) || '';
            const newContent = processor(currentContent);
            files.set(file.path, newContent);
        })
    } as unknown as Vault;
}

describe('FileManager.appendToFileBody', () => {
    let vault: Vault;
    let fileManager: FileManager;
    let testFile: TFile;

    beforeEach(() => {
        vault = createMockVault();
        fileManager = new FileManager(vault);
        testFile = { path: 'Ideas/test-idea.md' } as TFile;
    });

    it('should append content to empty file', async () => {
        await vault.create(testFile.path, '');
        
        await fileManager.appendToFileBody(testFile, 'Name Variants', '## Name Variants\n\n- Variant1 (synonym)');
        
        const processCall = vi.mocked(vault.process).mock.calls[0];
        const processor = processCall[1];
        const result = processor('');
        
        expect(result).toContain('## Name Variants');
        expect(result).toContain('- Variant1 (synonym)');
    });

    it('should append content to file with existing content', async () => {
        const existingContent = '---\nfrontmatter\n---\n\nIdea text here.';
        await vault.create(testFile.path, existingContent);
        
        await fileManager.appendToFileBody(testFile, 'Name Variants', '## Name Variants\n\n- Variant1');
        
        const processCall = vi.mocked(vault.process).mock.calls[0];
        const processor = processCall[1];
        const result = processor(existingContent);
        
        expect(result).toContain('Idea text here.');
        expect(result).toContain('## Name Variants');
    });

    it('should replace existing section if found', async () => {
        const existingContent = 'Idea text\n\n## Name Variants\n\n- Old variant\n\nMore content';
        await vault.create(testFile.path, existingContent);
        
        await fileManager.appendToFileBody(testFile, 'Name Variants', '## Name Variants\n\n- New variant', true);
        
        const processCall = vi.mocked(vault.process).mock.calls[0];
        const processor = processCall[1];
        const result = processor(existingContent);
        
        expect(result).toContain('- New variant');
        expect(result).not.toContain('- Old variant');
        expect(result).toContain('More content');
    });

    it('should append new section if replaceExisting is false', async () => {
        const existingContent = 'Idea text\n\n## Name Variants\n\n- Old variant';
        await vault.create(testFile.path, existingContent);
        
        await fileManager.appendToFileBody(testFile, 'Name Variants', '## Name Variants\n\n- New variant', false);
        
        const processCall = vi.mocked(vault.process).mock.calls[0];
        const processor = processCall[1];
        const result = processor(existingContent);
        
        // Should have both sections
        const variantSections = (result.match(/## Name Variants/g) || []).length;
        expect(variantSections).toBeGreaterThan(1);
    });

    it('should handle section detection with case-insensitive matching', async () => {
        const existingContent = 'Idea text\n\n## name variants\n\n- Old';
        await vault.create(testFile.path, existingContent);
        
        await fileManager.appendToFileBody(testFile, 'Name Variants', '## Name Variants\n\n- New', true);
        
        const processCall = vi.mocked(vault.process).mock.calls[0];
        const processor = processCall[1];
        const result = processor(existingContent);
        
        expect(result).toContain('- New');
        expect(result).not.toContain('- Old');
    });

    it('should handle file with no newline at end', async () => {
        const existingContent = 'Idea text';
        await vault.create(testFile.path, existingContent);
        
        await fileManager.appendToFileBody(testFile, 'Name Variants', '## Name Variants\n\n- Variant1');
        
        const processCall = vi.mocked(vault.process).mock.calls[0];
        const processor = processCall[1];
        const result = processor(existingContent);
        
        expect(result).toContain('Idea text');
        expect(result).toContain('## Name Variants');
    });
});

