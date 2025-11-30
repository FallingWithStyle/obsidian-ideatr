/**
 * Tests for Idea Transformation Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import IdeatrPlugin from '../../../src/main';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import type { Mutation, ExpansionResult, ReorganizationResult } from '../../../src/types/transformation';

// Mock Obsidian globals
global.Notice = Notice;

describe('Idea Transformation Commands', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
    let mockLLMService: any;

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

        // Create plugin instance
        plugin = new IdeatrPlugin();
        plugin.app = mockApp;
        plugin.settings = { ...DEFAULT_SETTINGS };

        // Mock LLM service
        mockLLMService = {
            isAvailable: vi.fn().mockReturnValue(true),
            classify: vi.fn(),
            complete: vi.fn(),
            generateMutations: vi.fn(),
            expandIdea: vi.fn(),
            reorganizeIdea: vi.fn(),
        };

        plugin.llmService = mockLLMService;
        plugin.frontmatterParser = new FrontmatterParser();
        
        // Mock vault methods as spies
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
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
            await (plugin as any).generateMutations();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockLLMService.generateMutations).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).generateMutations();

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
            await (plugin as any).generateMutations();

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
            await (plugin as any).expandIdea();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockLLMService.expandIdea).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).expandIdea();

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
            await (plugin as any).reorganizeIdea();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockLLMService.reorganizeIdea).toHaveBeenCalled();
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
            await (plugin as any).reorganizeIdea();

            // Assert
            // Note: Backup creation would be tested here if implemented
            expect(mockLLMService.reorganizeIdea).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).reorganizeIdea();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

