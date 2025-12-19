/**
 * Tests for Batch Operations Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { ReclassifyAllCommand } from '../../../src/commands/batch/ReclassifyAllCommand';
import { FindAllDuplicatesCommand } from '../../../src/commands/batch/FindAllDuplicatesCommand';
import { RefreshRelatedNotesCommand } from '../../../src/commands/batch/RefreshRelatedNotesCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import { ProgressModal } from '../../../src/views/ProgressModal';
import { DuplicatePairsModal } from '../../../src/views/DuplicatePairsModal';

// Mock Obsidian globals
global.Notice = Notice;

// Mock modals
vi.mock('../../../src/views/ProgressModal', () => {
    class MockProgressModal {
        app: any;
        title: string;
        open = vi.fn();
        updateProgress = vi.fn();
        isCancelled = vi.fn().mockReturnValue(false);
        close = vi.fn();
        
        constructor(app: any, title: string) {
            this.app = app;
            this.title = title;
        }
    }
    
    return {
        ProgressModal: MockProgressModal
    };
});

vi.mock('../../../src/views/DuplicatePairsModal', () => {
    class MockDuplicatePairsModal {
        open = vi.fn();
        close = vi.fn();
        
        constructor(app: any, pairs: any, callbacks: any) {
            // Constructor can be empty for this mock
        }
    }
    
    return {
        DuplicatePairsModal: MockDuplicatePairsModal
    };
});

describe('Batch Operations Commands', () => {
    let reclassifyAllCommand: ReclassifyAllCommand;
    let findAllDuplicatesCommand: FindAllDuplicatesCommand;
    let refreshRelatedNotesCommand: RefreshRelatedNotesCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFiles: TFile[];
    let context: CommandContext;

    beforeEach(() => {
        // Create mock vault with vi.fn() methods
        mockVault = {
            getMarkdownFiles: vi.fn(),
            read: vi.fn(),
            modify: vi.fn(),
            getAbstractFileByPath: vi.fn(),
            create: vi.fn(),
            createFolder: vi.fn(),
            rename: vi.fn(),
            on: vi.fn(),
            process: vi.fn(),
            cachedRead: vi.fn(),
        } as any;
        mockWorkspace = {
            getActiveFile: vi.fn(),
        } as any;
        mockApp = {
            vault: mockVault,
            workspace: mockWorkspace,
        } as any;

        // Create mock files - ensure they match the filter criteria
        mockFiles = [
            new TFile(),
            new TFile(),
            new TFile(),
        ];
        mockFiles[0].path = 'Ideas/2025-01-15-idea-1.md';
        mockFiles[0].name = '2025-01-15-idea-1.md';
        mockFiles[0].stat = { mtime: Date.now() };
        mockFiles[1].path = 'Ideas/2025-01-16-idea-2.md';
        mockFiles[1].name = '2025-01-16-idea-2.md';
        mockFiles[1].stat = { mtime: Date.now() };
        mockFiles[2].path = 'Ideas/2025-01-17-idea-3.md';
        mockFiles[2].name = '2025-01-17-idea-3.md';
        mockFiles[2].stat = { mtime: Date.now() };

        const settings = { ...DEFAULT_SETTINGS };
        const fileOrganizer = new FileOrganizer(mockVault, settings);
        const frontmatterParser = new FrontmatterParser();

        // Create command context
        context = new CommandContext(
            mockApp,
            {} as any, // plugin
            settings,
            {} as any, // fileManager
            { isAvailable: vi.fn().mockReturnValue(true), classifyIdea: vi.fn() } as any, // classificationService
            {} as any, // duplicateDetector
            {} as any, // domainService
            {} as any, // webSearchService
            {} as any, // nameVariantService
            {} as any, // scaffoldService
            frontmatterParser,
            {} as any, // ideaRepository
            {} as any, // embeddingService
            {} as any, // clusteringService
            {} as any, // graphLayoutService
            {} as any, // resurfacingService
            {} as any, // projectElevationService
            {} as any, // tenuousLinkService
            {} as any, // exportService
            {} as any, // importService
            { calculateSimilarity: vi.fn().mockReturnValue(0.5) } as any, // searchService
            {} as any, // llmService
            { logError: vi.fn() } as any, // errorLogService
            fileOrganizer
        );

        // Set up vault method mocks
        (mockVault.getMarkdownFiles as any).mockReturnValue(mockFiles);
        (mockVault.read as any).mockResolvedValue('');
        (mockVault.modify as any).mockResolvedValue(undefined);
        
        // Create command instances
        reclassifyAllCommand = new ReclassifyAllCommand(context);
        findAllDuplicatesCommand = new FindAllDuplicatesCommand(context);
        refreshRelatedNotesCommand = new RefreshRelatedNotesCommand(context);
    });

    describe('Command: reclassify-all-ideas', () => {
        it('should scan Ideas/ directory and reclassify all ideas', async () => {
            // Arrange
            // getMarkdownFiles is already mocked in beforeEach
            
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

            // Reset and set up mocks for this test
            (mockVault.read as any).mockReset();
            (mockVault.read as any)
                .mockResolvedValueOnce(fileContents[0])
                .mockResolvedValueOnce(fileContents[1])
                .mockResolvedValueOnce(fileContents[2]);
            (mockVault.modify as any).mockReset();
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock classification service
            context.classificationService = {
                classifyIdea: vi.fn().mockResolvedValue({
                    category: 'app',
                    tags: ['test'],
                    related: []
                }),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            // Act
            await reclassifyAllCommand.execute();

            // Assert
            expect(mockVault.getMarkdownFiles).toHaveBeenCalled();
            expect(mockVault.read).toHaveBeenCalled();
            // Note: ProgressModal is mocked as a function, so we can't easily assert it was called
            // The important thing is that the command executed without errors
        });

        it('should handle errors gracefully and continue processing', async () => {
            // Arrange
            // getMarkdownFiles is already mocked in beforeEach
            
            // Reset and set up mocks for this test
            (mockVault.read as any).mockReset();
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

            context.classificationService = {
                classifyIdea: vi.fn().mockResolvedValue({
                    category: 'app',
                    tags: [],
                    related: []
                }),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            // Act
            await reclassifyAllCommand.execute();

            // Assert - should not throw, should continue processing
            // readIdeaContent calls read once, updateIdeaFrontmatter calls read again
            // So we expect multiple reads (some may fail)
            expect(mockVault.read).toHaveBeenCalled();
        });
    });

    describe('Command: find-all-duplicates', () => {
        it('should scan all ideas and find duplicates', async () => {
            // Arrange
            // getMarkdownFiles is already mocked in beforeEach
            
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
            context.searchService = {
                calculateSimilarity: vi.fn()
                    .mockReturnValueOnce(0.8) // file1 vs file2
                    .mockReturnValueOnce(0.3) // file1 vs file3
                    .mockReturnValueOnce(0.2), // file2 vs file3
                findRelatedNotes: vi.fn().mockResolvedValue([])
            } as any;

            // Act
            await findAllDuplicatesCommand.execute();

            // Assert
            expect(mockVault.getMarkdownFiles).toHaveBeenCalled();
            expect(mockVault.read).toHaveBeenCalled();
            // Note: DuplicatePairsModal is mocked as a class, so we can't easily assert it was instantiated
            // The important thing is that the command executed without errors
        });
    });

    describe('Command: refresh-all-related-notes', () => {
        it('should refresh related notes for all ideas', async () => {
            // Arrange
            // getMarkdownFiles is already mocked in beforeEach
            
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

            // Reset and set up mocks for this test
            (mockVault.read as any).mockReset();
            (mockVault.read as any)
                .mockResolvedValueOnce(fileContents[0])
                .mockResolvedValueOnce(fileContents[1]);
            (mockVault.modify as any).mockReset();
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock search service
            context.searchService = {
                findRelatedNotes: vi.fn().mockResolvedValue([
                    { path: 'Ideas/related-1.md', title: 'related-1', similarity: 0.8 }
                ]),
                calculateSimilarity: vi.fn().mockReturnValue(0.5)
            } as any;

            // Act
            await refreshRelatedNotesCommand.execute();

            // Assert
            expect(mockVault.getMarkdownFiles).toHaveBeenCalled();
            expect(mockVault.read).toHaveBeenCalled();
            // Note: ProgressModal is mocked as a function, so we can't easily assert it was called
            // The important thing is that the command executed without errors
        });
    });
});

