/**
 * Tests for Manual Validation Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { DuplicateCheckCommand } from '../../../src/commands/validation/DuplicateCheckCommand';
import { RelatedNotesCommand } from '../../../src/commands/validation/RelatedNotesCommand';
import { QuickValidateCommand } from '../../../src/commands/validation/QuickValidateCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { DomainService } from '../../../src/services/DomainService';
import { WebSearchService } from '../../../src/services/WebSearchService';
import { DuplicateDetector } from '../../../src/services/DuplicateDetector';
import { SearchService } from '../../../src/services/SearchService';
import { ProspectrService } from '../../../src/services/ProspectrService';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import type { DomainCheckResult } from '../../../src/types/domain';
import type { SearchResult } from '../../../src/types/search';
import type { RelatedNote } from '../../../src/types/search';
import type { DuplicateCheckResult } from '../../../src/types/classification';
import { DuplicateResultsModal } from '../../../src/views/DuplicateResultsModal';
import { RelatedNotesModal } from '../../../src/views/RelatedNotesModal';
import { DomainCheckCommand } from '../../../src/commands/validation/DomainCheckCommand';
import { ExistenceSearchCommand } from '../../../src/commands/validation/ExistenceSearchCommand';

// Mock Obsidian globals
global.Notice = Notice;

// Mock modals
const MockDuplicateResultsModal = vi.hoisted(() => vi.fn().mockImplementation((app, duplicates, callback) => ({
    open: vi.fn()
})));

const MockRelatedNotesModal = vi.hoisted(() => vi.fn().mockImplementation((app, notes, current, callback) => ({
    open: vi.fn()
})));

vi.mock('../../../src/views/DuplicateResultsModal', () => ({
    DuplicateResultsModal: MockDuplicateResultsModal
}));

vi.mock('../../../src/views/RelatedNotesModal', () => ({
    RelatedNotesModal: MockRelatedNotesModal
}));

describe('Manual Validation Commands', () => {
    let duplicateCheckCommand: DuplicateCheckCommand;
    let relatedNotesCommand: RelatedNotesCommand;
    let quickValidateCommand: QuickValidateCommand;
    let domainCheckCommand: DomainCheckCommand;
    let existenceSearchCommand: ExistenceSearchCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
    let mockDomainService: DomainService;
    let mockWebSearchService: WebSearchService;
    let mockDuplicateDetector: DuplicateDetector;
    let mockSearchService: SearchService;
    let context: CommandContext;

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

        // Create mock file
        mockFile = new TFile();
        mockFile.path = 'Ideas/2025-01-15-test-idea.md';
        mockFile.name = '2025-01-15-test-idea.md';

        const settings = { ...DEFAULT_SETTINGS };

        // Initialize services
        const prospectrService = new ProspectrService();
        // Mock ProspectrService as available
        vi.spyOn(prospectrService, 'isAvailable').mockReturnValue(true);
        
        mockDomainService = new DomainService(prospectrService);
        mockWebSearchService = new WebSearchService(settings);
        // Mock WebSearchService as available
        vi.spyOn(mockWebSearchService, 'isAvailable').mockReturnValue(true);
        
        mockSearchService = new SearchService(mockVault);
        mockDuplicateDetector = new DuplicateDetector(mockSearchService);

        const frontmatterParser = new FrontmatterParser();
        const fileOrganizer = new FileOrganizer(mockVault, settings);

        // Create command context
        context = new CommandContext(
            mockApp,
            {} as any, // plugin
            settings,
            {} as any, // fileManager
            {} as any, // classificationService
            mockDuplicateDetector,
            mockDomainService,
            mockWebSearchService,
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
            mockSearchService,
            {} as any, // llmService
            { logError: vi.fn() } as any, // errorLogService
            fileOrganizer
        );

        // Create command instances
        duplicateCheckCommand = new DuplicateCheckCommand(context);
        relatedNotesCommand = new RelatedNotesCommand(context);
        quickValidateCommand = new QuickValidateCommand(context);
        domainCheckCommand = new DomainCheckCommand(context);
        existenceSearchCommand = new ExistenceSearchCommand(context);
        
        // Mock vault methods as spies
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
    });

    describe('Command: check-domains', () => {
        it('should check domains for active file and update frontmatter', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

I want to create example.com and test.io
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock domain check results
            const checkDomainsSpy = vi.spyOn(context.domainService, 'checkDomains');
            checkDomainsSpy.mockResolvedValue([
                { domain: 'example.com', available: true, checkedAt: new Date().toISOString() },
                { domain: 'test.io', available: false, checkedAt: new Date().toISOString() },
            ] as DomainCheckResult[]);

            // Act
            await domainCheckCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(checkDomainsSpy).toHaveBeenCalled();
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify frontmatter was updated with domain results
            const modifyCallDomains = (mockVault.modify as any).mock.calls[0];
            expect(modifyCallDomains[1]).toContain('domains:');
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await domainCheckCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });

        it('should handle service unavailable gracefully', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);

            // Mock ProspectrService as unavailable (DomainService checks this internally)
            const prospectrService = (context.domainService as any).prospectrService;
            const isAvailableSpy = vi.spyOn(prospectrService, 'isAvailable');
            isAvailableSpy.mockReturnValue(false);

            // Act
            await domainCheckCommand.execute();

            // Assert
            expect(mockVault.modify).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockRejectedValue(new Error('Read failed'));

            // Act
            await domainCheckCommand.execute();

            // Assert - should not throw
            expect(mockVault.read).toHaveBeenCalled();
        });
    });

    describe('Command: search-existence', () => {
        it('should search for existence and update frontmatter', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

A mobile app for task management
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock search results
            const searchSpy = vi.spyOn(context.webSearchService, 'search');
            searchSpy.mockResolvedValue([
                {
                    title: 'Task Management App',
                    url: 'https://example.com',
                    snippet: 'A popular task management app',
                    relevance: 0.8,
                },
            ] as SearchResult[]);

            // Act
            await existenceSearchCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(searchSpy).toHaveBeenCalled();
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify frontmatter was updated with search results
            const modifyCallSearch = (mockVault.modify as any).mock.calls[0];
            expect(modifyCallSearch[1]).toContain('existence-check:');
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await existenceSearchCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });

        it('should handle service unavailable gracefully', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);

            // Mock service as unavailable
            const isAvailableSpy = vi.spyOn(context.webSearchService, 'isAvailable');
            isAvailableSpy.mockReturnValue(false);

            // Act
            await existenceSearchCommand.execute();

            // Assert
            expect(mockVault.modify).not.toHaveBeenCalled();
        });
    });

    describe('Command: check-duplicates', () => {
        it('should check for duplicates and show modal', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

A mobile app for task management
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);

            // Mock duplicate check results
            const checkDuplicateSpy = vi.spyOn(context.duplicateDetector, 'checkDuplicate');
            checkDuplicateSpy.mockResolvedValue({
                isDuplicate: true,
                duplicates: [
                    {
                        path: 'Ideas/2025-01-10-similar-idea.md',
                        title: 'Similar Idea',
                        similarity: 0.85,
                    },
                ],
                threshold: 0.75,
            } as DuplicateCheckResult);

            // Act
            await duplicateCheckCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(checkDuplicateSpy).toHaveBeenCalled();
            expect(MockDuplicateResultsModal).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await duplicateCheckCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });

        it('should handle no duplicates found', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
---

A unique idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);

            // Mock no duplicates
            const checkDuplicateSpy = vi.spyOn(context.duplicateDetector, 'checkDuplicate');
            checkDuplicateSpy.mockResolvedValue({
                isDuplicate: false,
                duplicates: [],
                threshold: 0.75,
            } as DuplicateCheckResult);

            // Act
            await duplicateCheckCommand.execute();

            // Assert
            expect(checkDuplicateSpy).toHaveBeenCalled();
        });
    });

    describe('Command: find-related-notes', () => {
        it('should find related notes and show modal', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

A mobile app for task management
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);

            // Mock related notes
            const findRelatedSpy = vi.spyOn(context.searchService, 'findRelatedNotes');
            findRelatedSpy.mockResolvedValue([
                {
                    path: 'Ideas/2025-01-10-related-idea.md',
                    title: 'Related Idea',
                    similarity: 0.7,
                },
            ] as RelatedNote[]);

            // Act
            await relatedNotesCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(findRelatedSpy).toHaveBeenCalled();
            expect(MockRelatedNotesModal).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await relatedNotesCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });

        it('should update frontmatter when user selects related notes', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

A mobile app for task management
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock related notes
            const findRelatedSpy = vi.spyOn(context.searchService, 'findRelatedNotes');
            findRelatedSpy.mockResolvedValue([
                {
                    path: 'Ideas/2025-01-10-related-idea.md',
                    title: 'Related Idea',
                    similarity: 0.7,
                },
            ] as RelatedNote[]);

            // Act
            await relatedNotesCommand.execute();

            // Assert
            expect(findRelatedSpy).toHaveBeenCalled();
            expect(MockRelatedNotesModal).toHaveBeenCalled();
            // Note: Modal interaction would be tested separately
        });
    });

    describe('Command: quick-validate', () => {
        it('should run all validations in parallel', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

A mobile app for task management with example.com
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock all services
            const checkDomainsSpy = vi.spyOn(context.domainService, 'checkDomains');
            checkDomainsSpy.mockResolvedValue([
                { domain: 'example.com', available: true, checkedAt: new Date().toISOString() },
            ] as DomainCheckResult[]);

            const searchSpy = vi.spyOn(context.webSearchService, 'search');
            searchSpy.mockResolvedValue([
                {
                    title: 'Task Management App',
                    url: 'https://example.com',
                    snippet: 'A popular task management app',
                    relevance: 0.8,
                },
            ] as SearchResult[]);

            const checkDuplicateSpy = vi.spyOn(context.duplicateDetector, 'checkDuplicate');
            checkDuplicateSpy.mockResolvedValue({
                isDuplicate: false,
                duplicates: [],
                threshold: 0.75,
            } as DuplicateCheckResult);

            // Act
            await quickValidateCommand.execute();

            // Assert
            expect(checkDomainsSpy).toHaveBeenCalled();
            expect(searchSpy).toHaveBeenCalled();
            expect(checkDuplicateSpy).toHaveBeenCalled();
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify frontmatter was updated with all results
            const modifyCallQuick = (mockVault.modify as any).mock.calls[0];
            expect(modifyCallQuick[1]).toContain('domains:');
            expect(modifyCallQuick[1]).toContain('existence-check:');
        });

        it('should handle partial failures gracefully', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

A mobile app for task management
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);

            // Mock one service to fail
            const checkDomainsSpy = vi.spyOn(context.domainService, 'checkDomains');
            checkDomainsSpy.mockRejectedValue(new Error('Domain check failed'));

            const searchSpy = vi.spyOn(context.webSearchService, 'search');
            searchSpy.mockResolvedValue([] as SearchResult[]);

            const checkDuplicateSpy = vi.spyOn(context.duplicateDetector, 'checkDuplicate');
            checkDuplicateSpy.mockResolvedValue({
                isDuplicate: false,
                duplicates: [],
                threshold: 0.75,
            } as DuplicateCheckResult);

            // Act
            await quickValidateCommand.execute();

            // Assert - should not throw, should continue with other validations
            expect(checkDomainsSpy).toHaveBeenCalled();
            expect(searchSpy).toHaveBeenCalled();
            expect(checkDuplicateSpy).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await quickValidateCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

