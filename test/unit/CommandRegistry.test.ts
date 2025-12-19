/**
 * Tests for CommandRegistry
 * Tests centralized command registration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Plugin } from '../../mocks/obsidian';
import { CommandRegistry } from '../../src/commands/CommandRegistry';
import { CommandContext } from '../../src/commands/base/CommandContext';
import { DEFAULT_SETTINGS } from '../../src/settings';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../src/utils/fileOrganization';
import { Logger } from '../../src/utils/logger';

// Mock Logger to disable debug mode (so debug command is not registered)
vi.mock('../../src/utils/logger', () => ({
    Logger: {
        isDebugEnabled: vi.fn(() => false),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('CommandRegistry', () => {
    let mockPlugin: Plugin;
    let mockContext: CommandContext;
    let registeredCommands: Array<{ id: string; name: string; callback: () => void }>;

    beforeEach(() => {
        registeredCommands = [];

        mockPlugin = {
            addCommand: vi.fn((command) => {
                registeredCommands.push(command);
            }),
        } as any;

        const mockApp = {
            vault: {
                getMarkdownFiles: vi.fn(() => []),
            } as any,
        } as any;

        const settings = { ...DEFAULT_SETTINGS };
        const fileOrganizer = new FileOrganizer(mockApp.vault, settings);
        const frontmatterParser = new FrontmatterParser();

        mockContext = new CommandContext(
            mockApp,
            {} as any, // plugin
            settings,
            {} as any, // fileManager
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
            { isAvailable: () => true } as any, // llmService
            { logError: vi.fn() } as any, // errorLogService
            fileOrganizer
        );
    });

    describe('registerAll', () => {
        it('should register all commands with the plugin', () => {
            CommandRegistry.registerAll(mockPlugin, mockContext);

            expect(mockPlugin.addCommand).toHaveBeenCalled();
            expect(registeredCommands.length).toBeGreaterThan(0);
        });

        it('should register capture commands', () => {
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const captureCommand = registeredCommands.find(cmd => cmd.id === 'capture-idea');
            expect(captureCommand).toBeDefined();
            expect(captureCommand?.name).toBe('Capture idea');
            expect(typeof captureCommand?.callback).toBe('function');
        });

        it.skip('should register validation commands', () => {
            // MVP MODE: Validation commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const validationCommands = [
                // Note: 'check-domains' command is hidden/removed
                { id: 'search-existence', name: 'Search Existence' },
                { id: 'check-duplicates', name: 'Check Duplicates' },
                { id: 'find-related-notes', name: 'Find Related Notes' },
                { id: 'quick-validate', name: 'Quick Validate' },
            ];

            validationCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it.skip('should register transformation commands', () => {
            // MVP MODE: Transformation commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const transformationCommands = [
                { id: 'generate-name-variants', name: 'Generate Name Variants' },
                { id: 'generate-scaffold', name: 'Generate Scaffold' },
                { id: 'generate-mutations', name: 'Generate Mutations' },
                { id: 'expand-idea', name: 'Expand Idea' },
                { id: 'reorganize-idea', name: 'Reorganize Idea' },
            ];

            transformationCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it.skip('should register lifecycle commands', () => {
            // MVP MODE: Lifecycle commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const lifecycleCommands = [
                { id: 'change-status', name: 'Change Status' },
                { id: 'archive-idea', name: 'Archive Idea' },
                { id: 'unarchive-idea', name: 'Unarchive Idea' },
                { id: 'add-codename', name: 'Generate Codename' },
            ];

            lifecycleCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it.skip('should register view commands', () => {
            // MVP MODE: View commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const viewCommands = [
                { id: 'open-dashboard', name: 'Open Dashboard' },
                { id: 'open-graph', name: 'Open Graph View' },
                { id: 'open-tutorials', name: 'Open Tutorials' },
            ];

            viewCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it.skip('should register management commands', () => {
            // MVP MODE: Management commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const managementCommands = [
                { id: 'classify-current-note', name: 'Classify Current Note' },
                { id: 'refresh-idea', name: 'Refresh Idea' },
                { id: 'export-ideas', name: 'Export Ideas' },
                { id: 'import-ideas', name: 'Import Ideas' },
                { id: 'generate-digest', name: 'Generate Weekly Digest' },
                { id: 'elevate-to-project', name: 'Elevate to Project' },
            ];

            managementCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it.skip('should register batch operation commands', () => {
            // MVP MODE: Batch operation commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const batchCommands = [
                { id: 'reclassify-all-ideas', name: 'Reclassify All Ideas' },
                { id: 'find-all-duplicates', name: 'Find All Duplicates' },
                { id: 'refresh-all-related-notes', name: 'Refresh All Related Notes' },
            ];

            batchCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it.skip('should register analysis commands', () => {
            // MVP MODE: Analysis commands are disabled
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const analysisCommands = [
                { id: 'find-tenuous-links', name: 'Find Tenuous Links' },
                { id: 'analyze-idea-cluster', name: 'Analyze Idea Cluster' },
                { id: 'show-idea-stats', name: 'Show Idea Statistics' },
            ];

            analysisCommands.forEach(expected => {
                const cmd = registeredCommands.find(c => c.id === expected.id);
                expect(cmd).toBeDefined();
                expect(cmd?.name).toBe(expected.name);
                expect(typeof cmd?.callback).toBe('function');
            });
        });

        it('should register all expected commands', () => {
            CommandRegistry.registerAll(mockPlugin, mockContext);

            // MVP MODE: Capture and Ideate commands are registered (plus debug command if debug mode is enabled)
            // In MVP mode, Logger.isDebugEnabled() returns false, so 2 commands should be registered
            expect(registeredCommands.length).toBe(2);
        });

        it('should create command instances when callbacks are invoked', () => {
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const captureCommand = registeredCommands.find(cmd => cmd.id === 'capture-idea');
            expect(captureCommand).toBeDefined();

            // Invoke the callback - should not throw
            expect(() => {
                captureCommand?.callback();
            }).not.toThrow();
        });

        it.skip('should log when callback is invoked', async () => {
            // MVP MODE: Expand command is disabled
            const loggerSpy = vi.spyOn(Logger, 'info').mockImplementation(() => {});
            
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const expandCommand = registeredCommands.find(cmd => cmd.id === 'expand-idea');
            expect(expandCommand).toBeDefined();
            expect(expandCommand?.callback).toBeDefined();

            // Invoke the callback
            await expandCommand?.callback();

            // Check that the callback was invoked (now using Logger.info instead of console.log)
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Callback invoked for: Expand Idea')
            );

            loggerSpy.mockRestore();
        });

        it('should register commands with unique IDs', () => {
            CommandRegistry.registerAll(mockPlugin, mockContext);

            const commandIds = registeredCommands.map(cmd => cmd.id);
            const uniqueIds = new Set(commandIds);

            expect(uniqueIds.size).toBe(commandIds.length);
        });
    });
});

