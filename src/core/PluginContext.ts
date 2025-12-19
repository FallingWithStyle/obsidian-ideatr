import { App } from 'obsidian';
import type IdeatrPlugin from '../main';
import type { IdeatrSettings } from '../settings';
import { CommandContext } from '../commands/base/CommandContext';
import { FileManager } from '../storage/FileManager';
import { ClassificationService } from '../services/ClassificationService';
import { DuplicateDetector } from '../services/DuplicateDetector';
import { DomainService } from '../services/DomainService';
import { WebSearchService } from '../services/WebSearchService';
import { NameVariantService } from '../services/NameVariantService';
import { ScaffoldService } from '../services/ScaffoldService';
import { FrontmatterParser } from '../services/FrontmatterParser';
import { IdeaRepository } from '../services/IdeaRepository';
import { EmbeddingService } from '../services/EmbeddingService';
import { ClusteringService } from '../services/ClusteringService';
import { GraphLayoutService } from '../services/GraphLayoutService';
import { ResurfacingService } from '../services/ResurfacingService';
import { ProjectElevationService } from '../services/ProjectElevationService';
import { TenuousLinkServiceImpl } from '../services/TenuousLinkService';
import { ExportService } from '../services/ExportService';
import { ImportService } from '../services/ImportService';
import { SearchService } from '../services/SearchService';
import type { ILLMService } from '../types/classification';
import { ErrorLogService } from '../services/ErrorLogService';
import { FileOrganizer } from '../utils/fileOrganization';

/**
 * Centralized plugin context
 * Holds all services and provides access to them
 */
export class PluginContext {
    public readonly commandContext: CommandContext;

    constructor(
        public readonly app: App,
        public readonly plugin: IdeatrPlugin,
        public readonly settings: IdeatrSettings,
        public readonly fileManager: FileManager,
        public readonly classificationService: ClassificationService,
        public readonly duplicateDetector: DuplicateDetector,
        public readonly domainService: DomainService,
        public readonly webSearchService: WebSearchService,
        public readonly nameVariantService: NameVariantService,
        public readonly scaffoldService: ScaffoldService,
        public readonly frontmatterParser: FrontmatterParser,
        public readonly ideaRepository: IdeaRepository,
        public readonly embeddingService: EmbeddingService,
        public readonly clusteringService: ClusteringService,
        public readonly graphLayoutService: GraphLayoutService,
        public readonly resurfacingService: ResurfacingService,
        public readonly projectElevationService: ProjectElevationService,
        public readonly tenuousLinkService: TenuousLinkServiceImpl,
        public readonly exportService: ExportService,
        public readonly importService: ImportService,
        public readonly searchService: SearchService,
        public readonly llmService: ILLMService,
        public readonly errorLogService: ErrorLogService,
        public readonly fileOrganizer: FileOrganizer
    ) {
        this.commandContext = new CommandContext(
            app,
            plugin,
            settings,
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
    }
}

