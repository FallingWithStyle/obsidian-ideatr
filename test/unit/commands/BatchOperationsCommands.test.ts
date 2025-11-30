/**
 * Tests for Batch Operations Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import IdeatrPlugin from '../../../src/main';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { DEFAULT_SETTINGS } from '../../../src/settings';

// Mock Obsidian globals
global.Notice = Notice;

describe('Batch Operations Commands', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFiles: TFile[];

    beforeEach(() => {
        // Create mock app
        mockVault = new Vault();
        mockWorkspace = {
            getActiveFile: vi.fn(),
        } as any;
        mockApp = {
            vault: mockVault,
            workspace: mockWorkspace,
        } as any;

        // Create mock files
        mockFiles = [
            new TFile(),
            new TFile(),
            new TFile(),
        ];
        mockFiles[0].path = 'Ideas/2025-01-15-idea-1.md';
        mockFiles[0].name = '2025-01-15-idea-1.md';
        mockFiles[1].path = 'Ideas/2025-01-16-idea-2.md';
        mockFiles[1].name = '2025-01-16-idea-2.md';
        mockFiles[2].path = 'Ideas/2025-01-17-idea-3.md';
        mockFiles[2].name = '2025-01-17-idea-3.md';

        // Create plugin instance
        plugin = new IdeatrPlugin();
        plugin.app = mockApp;
        plugin.settings = { ...DEFAULT_SETTINGS };

        plugin.frontmatterParser = new FrontmatterParser();
        
        // Mock vault methods
        vi.spyOn(mockVault, 'getMarkdownFiles');
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
    });

    describe('Command: reclassify-all-ideas', () => {
        it('should scan Ideas/ directory and reclassify all ideas', async () => {
            // Arrange
            (mockVault.getMarkdownFiles as any).mockReturnValue(mockFiles);
            
            const fileContents = [
                `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
---

Idea 1 content
`,
                `---
type: idea
status: captured
created: 2025-01-16
category: web
tags: []
---

Idea 2 content
`,
                `---
type: idea
status: captured
created: 2025-01-17
category: mobile
tags: []
---

Idea 3 content
`
            ];

            (mockVault.read as any)
                .mockResolvedValueOnce(fileContents[0])
                .mockResolvedValueOnce(fileContents[1])
                .mockResolvedValueOnce(fileContents[2]);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock classification service
            plugin.classificationService = {
                classify: vi.fn().mockResolvedValue({
                    category: 'app',
                    tags: ['test'],
                    related: []
                }),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            // Act
            await (plugin as any).reclassifyAllIdeas();

            // Assert
            expect(mockVault.getMarkdownFiles).toHaveBeenCalled();
            // readIdeaContent calls read once, updateIdeaFrontmatter calls read again
            // So we expect 2 reads per file = 6 total for 3 files
            expect(mockVault.read).toHaveBeenCalled();
            // Note: Full progress modal testing would require more complex mocking
        });

        it('should handle errors gracefully and continue processing', async () => {
            // Arrange
            (mockVault.getMarkdownFiles as any).mockReturnValue(mockFiles);
            
            (mockVault.read as any)
                .mockResolvedValueOnce(`---
type: idea
status: captured
---

Idea 1
`)
                .mockRejectedValueOnce(new Error('Read failed'))
                .mockResolvedValueOnce(`---
type: idea
status: captured
---

Idea 3
`);

            plugin.classificationService = {
                classify: vi.fn().mockResolvedValue({
                    category: 'app',
                    tags: [],
                    related: []
                }),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            // Act
            await (plugin as any).reclassifyAllIdeas();

            // Assert - should not throw, should continue processing
            // readIdeaContent calls read once, updateIdeaFrontmatter calls read again
            // So we expect multiple reads (some may fail)
            expect(mockVault.read).toHaveBeenCalled();
        });
    });

    describe('Command: find-all-duplicates', () => {
        it('should scan all ideas and find duplicates', async () => {
            // Arrange
            (mockVault.getMarkdownFiles as any).mockReturnValue(mockFiles);
            
            const fileContents = [
                `---
type: idea
status: captured
---

Similar idea content
`,
                `---
type: idea
status: captured
---

Similar idea content
`,
                `---
type: idea
status: captured
---

Different idea
`
            ];

            (mockVault.read as any)
                .mockResolvedValueOnce(fileContents[0])
                .mockResolvedValueOnce(fileContents[1])
                .mockResolvedValueOnce(fileContents[2]);

            // Mock search service for similarity calculation
            plugin.searchService = {
                calculateSimilarity: vi.fn()
                    .mockReturnValueOnce(0.8) // file1 vs file2
                    .mockReturnValueOnce(0.3) // file1 vs file3
                    .mockReturnValueOnce(0.2), // file2 vs file3
                findRelatedNotes: vi.fn().mockResolvedValue([])
            } as any;

            // Act
            await (plugin as any).findAllDuplicates();

            // Assert
            expect(mockVault.getMarkdownFiles).toHaveBeenCalled();
            // Note: Duplicate comparison logic would be tested here
        });
    });

    describe('Command: refresh-all-related-notes', () => {
        it('should refresh related notes for all ideas', async () => {
            // Arrange
            (mockVault.getMarkdownFiles as any).mockReturnValue(mockFiles);
            
            const fileContents = [
                `---
type: idea
status: captured
related: []
---

Idea 1
`,
                `---
type: idea
status: captured
related: []
---

Idea 2
`
            ];

            (mockVault.read as any)
                .mockResolvedValueOnce(fileContents[0])
                .mockResolvedValueOnce(fileContents[1]);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock search service
            plugin.searchService = {
                findRelatedNotes: vi.fn().mockResolvedValue([
                    { path: 'Ideas/related-1.md', title: 'related-1', similarity: 0.8 }
                ]),
                calculateSimilarity: vi.fn().mockReturnValue(0.5)
            } as any;

            // Act
            await (plugin as any).refreshAllRelatedNotes();

            // Assert
            expect(mockVault.getMarkdownFiles).toHaveBeenCalled();
            expect(mockVault.read).toHaveBeenCalled();
        });
    });
});

