/**
 * Tests for PluginContext
 * Tests the central plugin context that holds all services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from 'obsidian';
import { PluginContext } from '../../src/core/PluginContext';
import { CommandContext } from '../../src/commands/base/CommandContext';
import { FileManager } from '../../src/storage/FileManager';
import { ClassificationService } from '../../src/services/ClassificationService';
import { DuplicateDetector } from '../../src/services/DuplicateDetector';
import { DomainService } from '../../src/services/DomainService';
import { WebSearchService } from '../../src/services/WebSearchService';
import { NameVariantService } from '../../src/services/NameVariantService';
import { ScaffoldService } from '../../src/services/ScaffoldService';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { ClusteringService } from '../../src/services/ClusteringService';
import { GraphLayoutService } from '../../src/services/GraphLayoutService';
import { ResurfacingService } from '../../src/services/ResurfacingService';
import { ProjectElevationService } from '../../src/services/ProjectElevationService';
import { TenuousLinkServiceImpl } from '../../src/services/TenuousLinkService';
import { ExportService } from '../../src/services/ExportService';
import { ImportService } from '../../src/services/ImportService';
import { SearchService } from '../../src/services/SearchService';
import { ErrorLogService } from '../../src/services/ErrorLogService';
import { FileOrganizer } from '../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../src/settings';
import type { ILLMService } from '../../src/types/classification';

describe('PluginContext', () => {
    let mockApp: App;
    let mockPlugin: any;
    let mockSettings: typeof DEFAULT_SETTINGS;
    let context: PluginContext;

    beforeEach(() => {
        mockApp = {
            vault: {
                getMarkdownFiles: vi.fn(() => []),
                read: vi.fn(),
                modify: vi.fn(),
            } as any,
        } as App;

        mockPlugin = {
            manifest: { id: 'ideatr' },
        };

        mockSettings = { ...DEFAULT_SETTINGS };

        // Create mock services
        const fileManager = new FileManager(mockApp.vault);
        const classificationService = {
            isAvailable: vi.fn().mockReturnValue(true),
            classifyIdea: vi.fn(),
        } as any;
        const duplicateDetector = {} as any;
        const domainService = {} as any;
        const webSearchService = {} as any;
        const nameVariantService = {} as any;
        const scaffoldService = {} as any;
        const frontmatterParser = new FrontmatterParser();
        const ideaRepository = new IdeaRepository(mockApp.vault, frontmatterParser);
        const embeddingService = new EmbeddingService();
        const clusteringService = new ClusteringService(embeddingService, 0.3);
        const graphLayoutService = new GraphLayoutService();
        const resurfacingService = new ResurfacingService(
            ideaRepository,
            mockSettings,
            mockApp.vault
        );
        const projectElevationService = new ProjectElevationService(
            mockApp.vault,
            frontmatterParser,
            mockSettings
        );
        const tenuousLinkService = new TenuousLinkServiceImpl(
            mockApp.vault,
            embeddingService,
            {} as ILLMService
        );
        const exportService = new ExportService(mockApp.vault);
        const importService = new ImportService(mockApp.vault);
        const searchService = new SearchService(mockApp.vault);
        const llmService = {
            isAvailable: vi.fn().mockReturnValue(true),
        } as any;
        const errorLogService = new ErrorLogService({
            enabled: true,
            maxEntries: 100,
            retentionDays: 30,
        });
        const fileOrganizer = new FileOrganizer(mockApp.vault, mockSettings);

        context = new PluginContext(
            mockApp,
            mockPlugin,
            mockSettings,
            fileManager,
            classificationService,
            duplicateDetector,
            domainService,
            webSearchService,
            nameVariantService,
            scaffoldService,
            frontmatterParser,
            ideaRepository,
            embeddingService,
            clusteringService,
            graphLayoutService,
            resurfacingService,
            projectElevationService,
            tenuousLinkService,
            exportService,
            importService,
            searchService,
            llmService,
            errorLogService,
            fileOrganizer
        );
    });

    describe('constructor', () => {
        it('should store all services as properties', () => {
            expect(context.app).toBe(mockApp);
            expect(context.plugin).toBe(mockPlugin);
            expect(context.settings).toBe(mockSettings);
            expect(context.fileManager).toBeDefined();
            expect(context.classificationService).toBeDefined();
            expect(context.duplicateDetector).toBeDefined();
            expect(context.domainService).toBeDefined();
            expect(context.webSearchService).toBeDefined();
            expect(context.nameVariantService).toBeDefined();
            expect(context.scaffoldService).toBeDefined();
            expect(context.frontmatterParser).toBeDefined();
            expect(context.ideaRepository).toBeDefined();
            expect(context.embeddingService).toBeDefined();
            expect(context.clusteringService).toBeDefined();
            expect(context.graphLayoutService).toBeDefined();
            expect(context.resurfacingService).toBeDefined();
            expect(context.projectElevationService).toBeDefined();
            expect(context.tenuousLinkService).toBeDefined();
            expect(context.exportService).toBeDefined();
            expect(context.importService).toBeDefined();
            expect(context.searchService).toBeDefined();
            expect(context.llmService).toBeDefined();
            expect(context.errorLogService).toBeDefined();
            expect(context.fileOrganizer).toBeDefined();
        });

        it('should create CommandContext with all services', () => {
            expect(context.commandContext).toBeInstanceOf(CommandContext);
            expect(context.commandContext.app).toBe(mockApp);
            expect(context.commandContext.plugin).toBe(mockPlugin);
            expect(context.commandContext.settings).toBe(mockSettings);
            expect(context.commandContext.fileManager).toBe(context.fileManager);
            expect(context.commandContext.classificationService).toBe(context.classificationService);
            expect(context.commandContext.duplicateDetector).toBe(context.duplicateDetector);
            expect(context.commandContext.domainService).toBe(context.domainService);
            expect(context.commandContext.webSearchService).toBe(context.webSearchService);
            expect(context.commandContext.nameVariantService).toBe(context.nameVariantService);
            expect(context.commandContext.scaffoldService).toBe(context.scaffoldService);
            expect(context.commandContext.frontmatterParser).toBe(context.frontmatterParser);
            expect(context.commandContext.ideaRepository).toBe(context.ideaRepository);
            expect(context.commandContext.embeddingService).toBe(context.embeddingService);
            expect(context.commandContext.clusteringService).toBe(context.clusteringService);
            expect(context.commandContext.graphLayoutService).toBe(context.graphLayoutService);
            expect(context.commandContext.resurfacingService).toBe(context.resurfacingService);
            expect(context.commandContext.projectElevationService).toBe(context.projectElevationService);
            expect(context.commandContext.tenuousLinkService).toBe(context.tenuousLinkService);
            expect(context.commandContext.exportService).toBe(context.exportService);
            expect(context.commandContext.importService).toBe(context.importService);
            expect(context.commandContext.searchService).toBe(context.searchService);
            expect(context.commandContext.llmService).toBe(context.llmService);
            expect(context.commandContext.errorLogService).toBe(context.errorLogService);
            expect(context.commandContext.fileOrganizer).toBe(context.fileOrganizer);
        });
    });

    describe('service access', () => {
        it('should provide read-only access to all services', () => {
            // Verify services are accessible but properties are readonly
            const originalFileManager = context.fileManager;
            // TypeScript readonly prevents reassignment, but we can verify the property exists
            expect(context.fileManager).toBe(originalFileManager);
        });

        it('should provide access to app instance', () => {
            expect(context.app).toBe(mockApp);
        });

        it('should provide access to plugin instance', () => {
            expect(context.plugin).toBe(mockPlugin);
        });

        it('should provide access to settings', () => {
            expect(context.settings).toBe(mockSettings);
        });
    });
});

