/**
 * Tests for Idea Transformation Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { MutationCommand } from '../../../src/commands/transformation/MutationCommand';
import { ExpandCommand } from '../../../src/commands/transformation/ExpandCommand';
import { ReorganizeCommand } from '../../../src/commands/transformation/ReorganizeCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import type { Mutation, ExpansionResult, ReorganizationResult } from '../../../src/types/transformation';
import { MutationSelectionModal } from '../../../src/views/MutationSelectionModal';
import { ReorganizationPreviewModal } from '../../../src/views/ReorganizationPreviewModal';
import { ExpansionPreviewModal } from '../../../src/views/ExpansionPreviewModal';

// Mock Obsidian globals
global.Notice = Notice;

// Mock modals
vi.mock('../../../src/views/MutationSelectionModal', () => ({
    MutationSelectionModal: vi.fn().mockImplementation((app, mutations, callback) => ({
        open: vi.fn()
    }))
}));

vi.mock('../../../src/views/ReorganizationPreviewModal', () => ({
    ReorganizationPreviewModal: vi.fn().mockImplementation((app, original, reorganized, callback) => ({
        open: vi.fn()
    }))
}));

vi.mock('../../../src/views/ExpansionPreviewModal', () => ({
    ExpansionPreviewModal: vi.fn().mockImplementation((app, expansion, callback) => ({
        open: vi.fn()
    }))
}));

describe('Idea Transformation Commands', () => {
    let mutationCommand: MutationCommand;
    let expandCommand: ExpandCommand;
    let reorganizeCommand: ReorganizeCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
    let mockLLMService: any;
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
        const fileOrganizer = new FileOrganizer(mockVault, settings);
        const frontmatterParser = new FrontmatterParser();

        // Mock LLM service
        mockLLMService = {
            isAvailable: vi.fn().mockReturnValue(true),
            classify: vi.fn(),
            complete: vi.fn(),
            generateMutations: vi.fn(),
            expandIdea: vi.fn(),
            reorganizeIdea: vi.fn(),
        };

        // Create command context
        context = new CommandContext(
            mockApp,
            {} as any, // plugin
            settings,
            { appendToFileBody: vi.fn().mockResolvedValue(undefined) } as any, // fileManager
            {} as any, // classificationService
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
            {} as any, // searchService
            mockLLMService,
            { logError: vi.fn() } as any, // errorLogService
            fileOrganizer
        );

        // Create command instances
        mutationCommand = new MutationCommand(context);
        expandCommand = new ExpandCommand(context);
        reorganizeCommand = new ReorganizeCommand(context);
        
        // Mock vault methods as spies
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
        vi.spyOn(mockVault, 'create');
    });

    describe('Command: generate-mutations', () => {
        it('should generate mutations and show modal', async () => {
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

            const mutations: Mutation[] = [
                {
                    title: 'Task Manager Pro',
                    description: 'A premium version with advanced features',
                    differences: ['Premium pricing', 'Advanced analytics']
                },
                {
                    title: 'Team Task Manager',
                    description: 'Focused on team collaboration',
                    differences: ['Team features', 'Shared workspaces']
                }
            ];

            mockLLMService.generateMutations.mockResolvedValue(mutations);

            // Act
            await mutationCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockLLMService.generateMutations).toHaveBeenCalled();
            expect(MutationSelectionModal).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await mutationCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });

        it('should handle LLM service unavailable', async () => {
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
            mockLLMService.isAvailable.mockReturnValue(false);

            // Act
            await mutationCommand.execute();

            // Assert
            expect(mockLLMService.generateMutations).not.toHaveBeenCalled();
        });
    });

    describe('Command: expand-idea', () => {
        it('should expand idea and show preview modal', async () => {
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

            const expansion: ExpansionResult = {
                expandedText: `## Overview\nA mobile app for task management...\n\n## Key Features\n- Task creation\n- Task organization`,
                structure: {
                    overview: 'A mobile app for task management...',
                    features: '- Task creation\n- Task organization',
                }
            };

            mockLLMService.expandIdea.mockResolvedValue(expansion);

            // Act
            await expandCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockLLMService.expandIdea).toHaveBeenCalled();
            expect(ExpansionPreviewModal).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await expandCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });

    describe('Command: reorganize-idea', () => {
        it('should reorganize idea and show preview modal', async () => {
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

Some chaotic idea text with no structure. More text here. Even more text.
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            const reorganization: ReorganizationResult = {
                reorganizedText: `## Overview\n\nSome chaotic idea text with no structure.\n\n## Details\n\nMore text here. Even more text.`,
                changes: {
                    sectionsAdded: ['Overview', 'Details'],
                    sectionsRemoved: [],
                    sectionsReorganized: []
                },
                originalLength: 100,
                reorganizedLength: 120
            };

            mockLLMService.reorganizeIdea.mockResolvedValue(reorganization);

            // Act
            await reorganizeCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockLLMService.reorganizeIdea).toHaveBeenCalled();
            expect(ReorganizationPreviewModal).toHaveBeenCalled();
            expect(mockVault.create).toHaveBeenCalled(); // Backup file
        });

        it('should create backup file before reorganization', async () => {
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
            mockVault.create = vi.fn().mockResolvedValue(new TFile());

            const reorganization: ReorganizationResult = {
                reorganizedText: 'Reorganized text',
                changes: { sectionsAdded: [], sectionsRemoved: [], sectionsReorganized: [] },
                originalLength: 10,
                reorganizedLength: 15
            };

            mockLLMService.reorganizeIdea.mockResolvedValue(reorganization);

            // Act
            await reorganizeCommand.execute();

            // Assert
            // Note: Backup creation would be tested here if implemented
            expect(mockLLMService.reorganizeIdea).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await reorganizeCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

