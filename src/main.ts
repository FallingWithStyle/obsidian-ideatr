import { Plugin } from 'obsidian';
import { CaptureModal } from './capture/CaptureModal';
import { FileManager } from './storage/FileManager';
import { generateFilename } from './storage/FilenameGenerator';
import { LlamaService } from './services/LlamaService';
import { SearchService } from './services/SearchService';
import { ClassificationService } from './services/ClassificationService';
import { DuplicateDetector } from './services/DuplicateDetector';
import { DomainService } from './services/DomainService';
import { ProspectrService } from './services/ProspectrService';
import { WebSearchService } from './services/WebSearchService';
import { NameVariantService } from './services/NameVariantService';
import { ScaffoldService } from './services/ScaffoldService';
import { FrontmatterParser } from './services/FrontmatterParser';
import { IdeaRepository } from './services/IdeaRepository';
import { EmbeddingService } from './services/EmbeddingService';
import { ClusteringService } from './services/ClusteringService';
import { GraphLayoutService } from './services/GraphLayoutService';
import { ResurfacingService } from './services/ResurfacingService';
import { ProjectElevationService } from './services/ProjectElevationService';
import { DashboardView } from './views/DashboardView';
import { GraphView } from './views/GraphView';
import { IdeatrSettings, DEFAULT_SETTINGS, IdeatrSettingTab } from './settings';
import { Notice, TFile } from 'obsidian';
import type { IdeaCategory, IdeaClassification } from './types/classification';
import { HybridLLM } from './services/HybridLLM';
import { ProviderFactory } from './services/providers/ProviderFactory';
import { ProviderAdapter } from './services/providers/ProviderAdapter';
import type { ILLMService } from './types/classification';
import { FirstLaunchSetupModal, isFirstLaunch } from './views/FirstLaunchSetupModal';
import { ModelManager } from './services/ModelManager';
import { UserFacingError } from './utils/errors';
import { ClassificationError, NetworkError, APITimeoutError } from './types/classification';
import type { DomainCheckResult } from './types/domain';
import type { SearchResult } from './types/search';
import type { DuplicateCheckResult } from './types/classification';
import { DuplicateResultsModal } from './views/DuplicateResultsModal';
import { DuplicatePairsModal, type DuplicatePair, type BulkAction } from './views/DuplicatePairsModal';
import { RelatedNotesModal } from './views/RelatedNotesModal';
import { MutationSelectionModal } from './views/MutationSelectionModal';
import { ExpansionPreviewModal } from './views/ExpansionPreviewModal';
import { ReorganizationPreviewModal } from './views/ReorganizationPreviewModal';
// Mutation, ExpansionResult, ReorganizationResult types available but not directly used in main.ts
import { FileOrganizer } from './utils/fileOrganization';
import { StatusPickerModal, type IdeaStatus } from './views/StatusPickerModal';
import { ProgressModal } from './views/ProgressModal';
import { TenuousLinksModal } from './views/TenuousLinksModal';
import { ClusterAnalysisModal, type ClusterInfo } from './views/ClusterAnalysisModal';
import { IdeaStatsModal, type IdeaStats } from './views/IdeaStatsModal';
import { ImportFilePickerModal } from './views/ImportFilePickerModal';
import { TenuousLinkServiceImpl } from './services/TenuousLinkService';
import { ExportService, type ExportFormat } from './services/ExportService';
import { ImportService } from './services/ImportService';
import { PROMPTS } from './services/prompts';
import { formatDate, sanitizeTitle } from './storage/FilenameGenerator';
import { extractIdeaNameRuleBased } from './utils/ideaNameExtractor';

/**
 * Ideatr Project Internal Plugin - Fast idea capture with intelligent classification
 */
export default class IdeatrPlugin extends Plugin {
    settings!: IdeatrSettings;
    private fileManager!: FileManager;
    private classificationService!: ClassificationService;
    private duplicateDetector!: DuplicateDetector;
    private llmService!: ILLMService; // Now uses HybridLLM
    private localLLMService!: LlamaService; // Keep reference to local LLM
    private domainService!: DomainService;
    private webSearchService!: WebSearchService;
    private searchService!: SearchService;
    nameVariantService!: NameVariantService;
    private scaffoldService!: ScaffoldService;
    private frontmatterParser!: FrontmatterParser;
    private ideaRepository!: IdeaRepository;
    private embeddingService!: EmbeddingService;
    private clusteringService!: ClusteringService;
    private graphLayoutService!: GraphLayoutService;
    private resurfacingService!: ResurfacingService;
    private projectElevationService!: ProjectElevationService;
    private modelManager!: ModelManager;
    fileOrganizer!: FileOrganizer; // Public for testing
    tenuousLinkService!: TenuousLinkServiceImpl; // Public for testing
    private exportService!: ExportService;
    private importService!: ImportService;

    async onload() {
        console.log('Loading Ideatr Project Internal plugin');

        await this.loadSettings();

        // Initialize ModelManager for first-launch detection
        this.modelManager = new ModelManager();

        // Check for first launch and show setup modal if needed
        if (isFirstLaunch(this.settings)) {
            // Delay slightly to ensure Obsidian UI is ready
            setTimeout(() => {
                new FirstLaunchSetupModal(
                    this.app,
                    this.modelManager,
                    this.settings,
                    async () => {
                        // Save settings after setup completion
                        await this.saveSettings();
                    }
                ).open();
            }, 100);
        }

        // Initialize FileManager
        this.fileManager = new FileManager(this.app.vault);

        // Initialize FileOrganizer
        this.fileOrganizer = new FileOrganizer(this.app.vault, this.settings);

        // Initialize Services
        // Initialize local LLM
        this.localLLMService = new LlamaService(this.settings);

        // Preload model on startup if enabled
        if (this.settings.preloadOnStartup && 
            this.settings.llmProvider === 'llama' && 
            this.settings.llamaBinaryPath && 
            this.settings.modelPath) {
            // Start server asynchronously (don't block plugin load)
            this.localLLMService.startServer().catch((error) => {
                console.warn('[Ideatr Project Internal] Failed to preload model on startup:', error);
            });
        }

        // Initialize cloud LLM if configured
        let cloudLLM: ILLMService | null = null;
        if (this.settings.cloudProvider !== 'none' && this.settings.cloudApiKey.trim().length > 0) {
            try {
                const provider = ProviderFactory.createProvider(
                    this.settings.cloudProvider,
                    this.settings.cloudApiKey,
                    {
                        openRouterModel: this.settings.openRouterModel,
                        customEndpointUrl: this.settings.customEndpointUrl
                    }
                );
                cloudLLM = new ProviderAdapter(provider);
                console.log(`[Ideatr Project Internal] Cloud AI provider initialized: ${provider.name}`);
            } catch (error) {
                console.warn('[Ideatr Project Internal] Failed to initialize cloud provider:', error);
                new Notice('Failed to initialize cloud AI provider. Using local AI only.');
            }
        }

        // Create HybridLLM to manage both local and cloud
        this.llmService = new HybridLLM(
            this.localLLMService,
            cloudLLM,
            this.settings.preferCloud
        );

        this.searchService = new SearchService(this.app.vault);
        this.classificationService = new ClassificationService(this.llmService, this.searchService);
        this.duplicateDetector = new DuplicateDetector(this.searchService);

        // Initialize validation services
        const prospectrService = new ProspectrService(
            this.settings.prospectrUrl,
            this.settings.domainCheckTimeout
        );
        this.domainService = new DomainService(prospectrService);
        this.webSearchService = new WebSearchService(this.settings);

        // Initialize transformation services
        this.nameVariantService = new NameVariantService(
            this.llmService, // Uses user's primary LLM selection (respects preferCloud setting)
            this.settings,
            async () => {
                // Load cache data
                const data = await this.loadData();
                return data?.variantCache || {};
            },
            async (cacheData: Record<string, any>) => {
                // Save cache data
                const data = await this.loadData();
                await this.saveData({
                    ...data,
                    variantCache: cacheData
                });
            }
        );
        this.scaffoldService = new ScaffoldService(this.app.vault);

        // Initialize management services
        this.frontmatterParser = new FrontmatterParser();
        this.ideaRepository = new IdeaRepository(this.app.vault, this.frontmatterParser);
        this.embeddingService = new EmbeddingService();
        this.clusteringService = new ClusteringService(
            this.embeddingService,
            this.settings.clusteringSimilarityThreshold || 0.3
        );
        this.graphLayoutService = new GraphLayoutService();
        this.resurfacingService = new ResurfacingService(
            this.ideaRepository,
            this.settings,
            this.app.vault
        );
        this.projectElevationService = new ProjectElevationService(
            this.app.vault,
            this.frontmatterParser,
            this.settings
        );

        // Initialize analysis and export/import services
        this.tenuousLinkService = new TenuousLinkServiceImpl(
            this.app.vault,
            this.embeddingService,
            this.llmService
        );
        this.exportService = new ExportService(this.app.vault);
        this.importService = new ImportService(this.app.vault);

        // Register Dashboard View
        this.registerView(
            'ideatr-dashboard',
            (leaf) => new DashboardView(
                leaf,
                this.ideaRepository,
                this.clusteringService,
                this.resurfacingService,
                this.projectElevationService,
                this.settings.dashboardItemsPerPage,
                this.settings.dashboardPersistFilters
            )
        );

        // Register Graph View
        this.registerView(
            'ideatr-graph',
            (leaf) => new GraphView(leaf, this.clusteringService, this.graphLayoutService, this.ideaRepository, this.projectElevationService)
        );

        // Register Settings Tab
        this.addSettingTab(new IdeatrSettingTab(this.app, this));

        // Register all commands
        console.log('Ideatr Project Internal: Starting command registration...');
        try {
            // Register command to open capture modal
            console.log('Ideatr Project Internal: Registering capture-idea command...');
            this.addCommand({
            id: 'capture-idea',
            name: 'Capture Idea',
            callback: () => {
                this.openCaptureModal();
            }
        });

            // Register name variant generation command
            console.log('Ideatr Project Internal: Registering generate-name-variants command...');
            this.addCommand({
            id: 'generate-name-variants',
            name: 'Generate Name Variants',
            callback: () => {
                this.generateNameVariants();
            }
        });

            // Register scaffold generation command
            console.log('Ideatr Project Internal: Registering generate-scaffold command...');
            this.addCommand({
            id: 'generate-scaffold',
            name: 'Generate Scaffold',
            callback: () => {
                this.generateScaffold();
            }
        });

            // Register dashboard command
            console.log('Ideatr Project Internal: Registering open-dashboard command...');
            this.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: () => {
                this.openDashboard();
            }
        });

            // Register graph view command
            console.log('Ideatr Project Internal: Registering open-graph command...');
            this.addCommand({
            id: 'open-graph',
            name: 'Open Graph View',
            callback: () => {
                this.openGraphView();
            }
        });

            // Register digest command
            console.log('Ideatr Project Internal: Registering generate-digest command...');
            this.addCommand({
            id: 'generate-digest',
            name: 'Generate Weekly Digest',
            callback: () => {
                this.generateDigest();
            }
        });

            // Register elevation command
            console.log('Ideatr Project Internal: Registering elevate-to-project command...');
            this.addCommand({
            id: 'elevate-to-project',
            name: 'Elevate to Project',
            callback: () => {
                this.elevateToProject();
            }
        });

        this.addCommand({
            id: 'classify-current-note',
            name: 'Classify Current Note',
            callback: () => {
                this.classifyCurrentNote();
            }
        });

            // Manual Validation Commands
            console.log('Ideatr Project Internal: Registering validation commands...');
            
            this.addCommand({
                id: 'check-domains',
                name: 'Check Domains',
                callback: () => {
                    this.checkDomains();
                }
            });

            this.addCommand({
                id: 'search-existence',
                name: 'Search Existence',
                callback: () => {
                    this.searchExistence();
                }
            });

            this.addCommand({
                id: 'check-duplicates',
                name: 'Check Duplicates',
                callback: () => {
                    this.checkDuplicates();
                }
            });

            this.addCommand({
                id: 'find-related-notes',
                name: 'Find Related Notes',
                callback: () => {
                    this.findRelatedNotes();
                }
            });

            this.addCommand({
                id: 'quick-validate',
                name: 'Quick Validate',
                callback: () => {
                    this.quickValidate();
                }
            });

            // Idea Transformation Commands
            console.log('Ideatr Project Internal: Registering transformation commands...');
            
            this.addCommand({
                id: 'generate-mutations',
                name: 'Generate Mutations',
                callback: () => {
                    this.generateMutations();
                }
            });

            this.addCommand({
                id: 'expand-idea',
                name: 'Expand Idea',
                callback: () => {
                    this.expandIdea();
                }
            });

            this.addCommand({
                id: 'reorganize-idea',
                name: 'Reorganize Idea',
                callback: () => {
                    this.reorganizeIdea();
                }
            });

            // Status & Lifecycle Commands
            console.log('Ideatr Project Internal: Registering status commands...');
            
            this.addCommand({
                id: 'change-status',
                name: 'Change Status',
                callback: () => {
                    this.changeStatus();
                }
            });

            this.addCommand({
                id: 'archive-idea',
                name: 'Archive Idea',
                callback: () => {
                    this.archiveIdea();
                }
            });

            this.addCommand({
                id: 'unarchive-idea',
                name: 'Unarchive Idea',
                callback: () => {
                    this.unarchiveIdea();
                }
            });

            this.addCommand({
                id: 'add-codename',
                name: 'Generate Codename',
                callback: () => {
                    this.addCodename();
                }
            });

            // Batch Operations Commands
            console.log('Ideatr Project Internal: Registering batch operation commands...');
            
            this.addCommand({
                id: 'reclassify-all-ideas',
                name: 'Reclassify All Ideas',
                callback: () => {
                    this.reclassifyAllIdeas();
                }
            });

            this.addCommand({
                id: 'find-all-duplicates',
                name: 'Find All Duplicates',
                callback: () => {
                    this.findAllDuplicates();
                }
            });

            this.addCommand({
                id: 'refresh-all-related-notes',
                name: 'Refresh All Related Notes',
                callback: () => {
                    this.refreshAllRelatedNotes();
                }
            });

            // Analysis & Insights Commands
            console.log('Ideatr Project Internal: Registering analysis commands...');
            
            this.addCommand({
                id: 'find-tenuous-links',
                name: 'Find Tenuous Links',
                callback: () => {
                    this.findTenuousLinks();
                }
            });

            this.addCommand({
                id: 'analyze-idea-cluster',
                name: 'Analyze Idea Cluster',
                callback: () => {
                    this.analyzeIdeaCluster();
                }
            });

            this.addCommand({
                id: 'show-idea-stats',
                name: 'Show Idea Statistics',
                callback: () => {
                    this.showIdeaStats();
                }
            });

            // Quick Actions Commands
            console.log('Ideatr Project Internal: Registering quick action commands...');
            
            this.addCommand({
                id: 'refresh-idea',
                name: 'Refresh Idea',
                callback: () => {
                    this.refreshIdea();
                }
            });

            // Export & Import Commands
            console.log('Ideatr Project Internal: Registering export/import commands...');
            
            this.addCommand({
                id: 'export-ideas',
                name: 'Export Ideas',
                callback: () => {
                    this.exportIdeas();
                }
            });

            this.addCommand({
                id: 'import-ideas',
                name: 'Import Ideas',
                callback: () => {
                    this.importIdeas();
                }
            });

            // Add ribbon icon
            this.addRibbonIcon('lightbulb', 'Capture Idea', () => {
                this.openCaptureModal();
            });

            console.log('Ideatr Project Internal: All commands registered successfully');
        } catch (error) {
            console.error('Ideatr Project Internal: Error registering commands:', error);
            console.error('Ideatr Project Internal: Error details:', error instanceof Error ? error.stack : error);
        }
    }

    openCaptureModal() {
        new CaptureModal(
            this.app,
            this.fileManager,
            this.classificationService,
            this.duplicateDetector,
            this.settings,
            this.domainService,
            this.webSearchService,
            this.nameVariantService
        ).open();
    }

    /**
     * Manually start the local LLM server (if using llama provider)
     */
    async startLocalModel(): Promise<void> {
        if (this.localLLMService && this.settings.llmProvider === 'llama') {
            await this.localLLMService.startServer();
        }
    }

    onunload() {
        console.log('Unloading Ideatr Project Internal plugin');
        if (this.localLLMService) {
            this.localLLMService.stopServer();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Generate name variants for the current active note
     */
    private async generateNameVariants(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (!activeFile) {
            new Notice('No active note. Please open an idea file.');
            return;
        }
        
        // Check if file is in Ideas/ directory (optional validation)
        if (!activeFile.path.startsWith('Ideas/')) {
            new Notice('This command works best with idea files in the Ideas/ directory.');
            // Continue anyway (user might have moved file)
        }
        
        try {
            // Read file content
            const content = await this.app.vault.read(activeFile);
            
            // Extract idea text (body, not frontmatter)
            const ideaText = this.extractBodyFromFile(content);
            
            if (!ideaText || ideaText.trim().length === 0) {
                new Notice('No idea text found in file.');
                return;
            }
            
            // Generate variants
            new Notice('Generating name variants...');
            const variants = await this.nameVariantService.generateVariants(ideaText);
            
            if (variants.length === 0) {
                new Notice('No name variants could be generated.');
                return;
            }
            
            // Format and append
            const formatted = this.nameVariantService.formatVariantsForMarkdown(variants);
            await this.fileManager.appendToFileBody(activeFile, 'Name Variants', formatted);
            
            new Notice(`Name variants generated and added to note.`);
        } catch (error) {
            console.error('Failed to generate name variants:', error);
            new Notice('Failed to generate name variants. Please try again.');
        }
    }

    /**
     * Classify the current active note
     */
    private async classifyCurrentNote(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (!activeFile) {
            new Notice('No active note. Please open an idea file.');
            return;
        }
        
        // Check if file is in Ideas/ directory (optional validation)
        if (!activeFile.path.startsWith('Ideas/')) {
            new Notice('This command works best with idea files in the Ideas/ directory.');
            // Continue anyway (user might have moved file)
        }
        
        try {
            // Read file content
            const content = await this.app.vault.read(activeFile);
            
            // Extract idea text (body, not frontmatter)
            const ideaText = this.extractBodyFromFile(content);
            
            if (!ideaText || ideaText.trim().length === 0) {
                new Notice('No idea text found in file.');
                return;
            }
            
            // Check if AI is available
            if (!this.classificationService.isAvailable()) {
                new Notice('AI classification is not configured. Please set up AI in settings.');
                return;
            }
            
            // Classify
            new Notice('Classifying idea...');
            const classification = await this.classificationService.classifyIdea(ideaText);
            
            // Update frontmatter
            await this.updateFrontmatter(activeFile, content, classification);
            
            new Notice('Classification complete!');
        } catch (error) {
            console.error('Failed to classify note:', error);
            new Notice('Failed to classify note. Please try again.');
        }
    }

    /**
     * Update frontmatter with classification results
     */
    private async updateFrontmatter(file: TFile, content: string, classification: IdeaClassification): Promise<void> {
        const frontmatterParser = new FrontmatterParser();
        const parsed = frontmatterParser.parse(content);
        
        // Update classification fields
        parsed.frontmatter.category = classification.category;
        parsed.frontmatter.tags = classification.tags;
        if (classification.related.length > 0) {
            parsed.frontmatter.related = classification.related;
        }
        
        // Rebuild content
        const updatedContent = frontmatterParser.build(parsed.frontmatter, parsed.body);
        
        // Write back to file
        await this.app.vault.modify(file, updatedContent);
    }

    /**
     * Generate scaffold for the current active note
     */
    private async generateScaffold(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (!activeFile) {
            new Notice('No active note. Please open an idea file.');
            return;
        }
        
        // Check if file is in Ideas/ directory (optional validation)
        if (!activeFile.path.startsWith('Ideas/')) {
            new Notice('This command works best with idea files in the Ideas/ directory.');
            // Continue anyway (user might have moved file)
        }
        
        try {
            // Read file content
            const content = await this.app.vault.read(activeFile);
            
            // Extract idea text (body, not frontmatter)
            const ideaText = this.extractBodyFromFile(content);
            
            if (!ideaText || ideaText.trim().length === 0) {
                new Notice('No idea text found in file.');
                return;
            }
            
            // Extract category from frontmatter if available
            let category: IdeaCategory = '';
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
                const categoryMatch = frontmatterMatch[1].match(/^category:\s*(.+)$/m);
                if (categoryMatch) {
                    const categoryValue = categoryMatch[1].trim();
                    // Cast to IdeaCategory (validation happens at runtime)
                    category = categoryValue as IdeaCategory;
                }
            }
            
            // Generate scaffold
            new Notice('Generating scaffold...');
            const scaffold = await this.scaffoldService.generateScaffold(ideaText, category);
            
            // Determine action (append or new note)
            const action = this.settings.scaffoldDefaultAction || 'append';
            
            if (action === 'append') {
                // Append to current note
                await this.fileManager.appendToFileBody(activeFile, 'Scaffold', scaffold);
                new Notice('Scaffold generated and added to note.');
            } else {
                // Create new note (future enhancement - for now, just append)
                await this.fileManager.appendToFileBody(activeFile, 'Scaffold', scaffold);
                new Notice('Scaffold generated and added to note.');
            }
        } catch (error) {
            console.error('Failed to generate scaffold:', error);
            new Notice('Failed to generate scaffold. Please try again.');
        }
    }

    // ============================================================================
    // Manual Validation Commands - Helper Methods
    // ============================================================================

    /**
     * Get active idea file or show error
     */
    private async getActiveIdeaFile(): Promise<TFile | null> {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('No active note. Please open an idea file.');
            return null;
        }
        if (!file.path.startsWith('Ideas/')) {
            new Notice('This command works best with idea files in the Ideas/ directory.');
            // Continue anyway (user might have moved file)
        }
        return file;
    }

    /**
     * Read idea content and parse frontmatter
     */
    private async readIdeaContent(file: TFile): Promise<{ frontmatter: any; body: string; content: string }> {
        const content = await this.app.vault.read(file);
        const parsed = this.frontmatterParser.parse(content);
        return {
            frontmatter: parsed.frontmatter,
            body: parsed.body,
            content: content
        };
    }

    /**
     * Update idea frontmatter with new values
     */
    private async updateIdeaFrontmatter(
        file: TFile,
        updates: Partial<any>
    ): Promise<void> {
        const content = await this.app.vault.read(file);
        const parsed = this.frontmatterParser.parse(content);
        
        const updated = { ...parsed.frontmatter, ...updates };
        const newContent = this.frontmatterParser.build(updated, parsed.body);
        
        await this.app.vault.modify(file, newContent);
    }

    /**
     * Check service availability and show notice if unavailable
     */
    private checkServiceAvailability(
        service: { isAvailable(): boolean },
        serviceName: string
    ): boolean {
        if (!service.isAvailable()) {
            new Notice(`${serviceName} is not configured. Please set it up in settings.`);
            return false;
        }
        return true;
    }

    /**
     * Check if DomainService is available (checks ProspectrService internally)
     */
    private checkDomainServiceAvailability(): boolean {
        const prospectrService = (this.domainService as any).prospectrService;
        if (!prospectrService || !prospectrService.isAvailable()) {
            if (this.settings.enableProspectr) {
                new Notice('Domain checking is not configured. Please set up Prospectr in settings.');
            } else {
                new Notice('Domain checking is not available.');
            }
            return false;
        }
        return true;
    }

    // ============================================================================
    // Manual Validation Commands - Command Handlers
    // ============================================================================

    /**
     * Command: check-domains
     * Check domain availability for current note
     */
    private async checkDomains(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.checkDomainServiceAvailability()) {
                return;
            }

            const { body } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Checking domains...');
            const results = await this.domainService.checkDomains(ideaText);

            if (results.length === 0) {
                new Notice('No domains found in idea text.');
                return;
            }

            // Format results for frontmatter (array of strings: "domain.com: available" or "domain.com: unavailable")
            const domainStrings = results.map(r => 
                r.available ? `${r.domain}: available` : `${r.domain}: unavailable${r.error ? ` (${r.error})` : ''}`
            );

            await this.updateIdeaFrontmatter(file, { domains: domainStrings });

            const availableCount = results.filter(r => r.available).length;
            new Notice(`Domain check complete: ${availableCount}/${results.length} available`);
        } catch (error) {
            console.error('Failed to check domains:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to check domains. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: search-existence
     * Search for similar ideas/products/services
     */
    private async searchExistence(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.checkServiceAvailability(this.webSearchService, 'Web search')) {
                return;
            }

            const { frontmatter, body } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            const category = frontmatter.category || '';
            new Notice('Searching for similar ideas...');
            const results = await this.webSearchService.search(ideaText, category as any);

            if (results.length === 0) {
                new Notice('No similar ideas found.');
                return;
            }

            // Format results for frontmatter (array of summaries)
            const summaries = results.map(r => 
                `${r.title}: ${r.snippet} (${r.url})`
            );

            await this.updateIdeaFrontmatter(file, { 'existence-check': summaries });

            new Notice(`Search complete: Found ${results.length} similar idea${results.length > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Failed to search existence:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to search for similar ideas. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: check-duplicates
     * Check for duplicate ideas
     */
    private async checkDuplicates(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            const { body } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Checking for duplicates...');
            const result = await this.duplicateDetector.checkDuplicate(ideaText);

            if (!result.isDuplicate || result.duplicates.length === 0) {
                new Notice('No duplicates found.');
                return;
            }

            // Show modal with duplicates
            new DuplicateResultsModal(
                this.app,
                result.duplicates,
                async (selected) => {
                    // Update frontmatter with selected duplicates
                    const relatedPaths = selected.map(d => d.path);
                    await this.updateIdeaFrontmatter(file, { related: relatedPaths });
                    new Notice(`Linked ${selected.length} duplicate${selected.length > 1 ? 's' : ''} in frontmatter.`);
                }
            ).open();
        } catch (error) {
            console.error('Failed to check duplicates:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to check for duplicates. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: find-related-notes
     * Find related notes and allow user to link them
     */
    private async findRelatedNotes(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            const { body, frontmatter } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Finding related notes...');
            const relatedNotes = await this.searchService.findRelatedNotes(ideaText, 10);

            if (relatedNotes.length === 0) {
                new Notice('No related notes found.');
                return;
            }

            // Show modal with related notes
            new RelatedNotesModal(
                this.app,
                relatedNotes,
                frontmatter.related || [],
                async (selected) => {
                    // Update frontmatter with selected related notes
                    const relatedPaths = selected.map(n => n.path);
                    await this.updateIdeaFrontmatter(file, { related: relatedPaths });
                    new Notice(`Linked ${selected.length} related note${selected.length > 1 ? 's' : ''} in frontmatter.`);
                }
            ).open();
        } catch (error) {
            console.error('Failed to find related notes:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to find related notes. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: quick-validate
     * Run all validations in parallel
     */
    private async quickValidate(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            const { frontmatter, body } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Running all validations...');

            // Run all validations in parallel
            const results = await Promise.allSettled([
                this.domainService.checkDomains(ideaText).catch(e => {
                    console.error('Domain check failed:', e);
                    return [] as DomainCheckResult[];
                }),
                this.webSearchService.isAvailable() 
                    ? this.webSearchService.search(ideaText, frontmatter.category as any).catch(e => {
                        console.error('Web search failed:', e);
                        return [] as SearchResult[];
                    })
                    : Promise.resolve([] as SearchResult[]),
                this.duplicateDetector.checkDuplicate(ideaText).catch(e => {
                    console.error('Duplicate check failed:', e);
                    return { isDuplicate: false, duplicates: [], threshold: 0.75 } as DuplicateCheckResult;
                }),
            ]);

            const domainResults = results[0].status === 'fulfilled' ? results[0].value : [];
            const searchResults = results[1].status === 'fulfilled' ? results[1].value : [];
            const duplicateResult = results[2].status === 'fulfilled' ? results[2].value : { isDuplicate: false, duplicates: [], threshold: 0.75 };

            // Update frontmatter with all results
            const updates: any = {};

            if (domainResults.length > 0) {
                const domainStrings = (domainResults as DomainCheckResult[]).map(r => 
                    r.available ? `${r.domain}: available` : `${r.domain}: unavailable${r.error ? ` (${r.error})` : ''}`
                );
                updates.domains = domainStrings;
            }

            if (searchResults.length > 0) {
                const summaries = (searchResults as SearchResult[]).map(r => 
                    `${r.title}: ${r.snippet} (${r.url})`
                );
                updates['existence-check'] = summaries;
            }

            if (duplicateResult.isDuplicate && duplicateResult.duplicates.length > 0) {
                // Don't auto-link duplicates, just notify user
                new Notice(`Found ${duplicateResult.duplicates.length} potential duplicate${duplicateResult.duplicates.length > 1 ? 's' : ''}. Use "check-duplicates" command to review.`);
            }

            if (Object.keys(updates).length > 0) {
                await this.updateIdeaFrontmatter(file, updates);
            }

            const summary = [
                `Domains: ${domainResults.length} checked`,
                `Search: ${searchResults.length} found`,
                `Duplicates: ${duplicateResult.isDuplicate ? duplicateResult.duplicates.length + ' found' : 'none'}`
            ].join(', ');

            new Notice(`Validation complete: ${summary}`);
        } catch (error) {
            console.error('Failed to run validations:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to run validations. Please try again or check console for details.');
            }
        }
    }

    // ============================================================================
    // Idea Transformation Commands - Command Handlers
    // ============================================================================

    /**
     * Command: generate-mutations
     * Generate idea variations/mutations
     */
    private async generateMutations(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.llmService.isAvailable()) {
                new Notice('AI service is not configured. Please set up AI in settings.');
                return;
            }

            const { body, frontmatter } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Generating mutations...');

            // Check if LLM service supports mutations
            if (!this.llmService.generateMutations) {
                new Notice('Mutation generation is not supported by the current AI provider.');
                return;
            }

            const mutations = await this.llmService.generateMutations(ideaText, {
                category: frontmatter.category,
                tags: frontmatter.tags,
                count: 8,
            });

            if (mutations.length === 0) {
                new Notice('No mutations could be generated.');
                return;
            }

            // Show modal with mutations
            new MutationSelectionModal(
                this.app,
                mutations,
                async (selected, action) => {
                    if (action === 'save') {
                        // Save selected mutations as new ideas
                        for (const mutation of selected) {
                            const newContent = `---
type: idea
status: captured
created: ${new Date().toISOString().split('T')[0]}
category: ${frontmatter.category || ''}
tags: ${JSON.stringify(frontmatter.tags || [])}
related: ${JSON.stringify([file.path])}
domains: []
existence-check: []
---

# ${mutation.title}

${mutation.description}

## Key Differences
${mutation.differences.map(d => `- ${d}`).join('\n')}
`;
                            const newPath = `Ideas/${generateFilename(mutation.title, new Date())}`;
                            await this.app.vault.create(newPath, newContent);
                        }
                        new Notice(`Created ${selected.length} new idea${selected.length > 1 ? 's' : ''} from mutations.`);
                    } else {
                        // Append to current note
                        const mutationsText = selected.map(m => 
                            `## ${m.title}\n\n${m.description}\n\n**Key Differences:**\n${m.differences.map(d => `- ${d}`).join('\n')}`
                        ).join('\n\n---\n\n');
                        await this.fileManager.appendToFileBody(file, 'Mutations', mutationsText);
                        new Notice(`Added ${selected.length} mutation${selected.length > 1 ? 's' : ''} to note.`);
                    }
                }
            ).open();
        } catch (error) {
            console.error('Failed to generate mutations:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to generate mutations. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: expand-idea
     * Expand idea with detailed description
     */
    private async expandIdea(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.llmService.isAvailable()) {
                new Notice('AI service is not configured. Please set up AI in settings.');
                return;
            }

            const { body, frontmatter } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Expanding idea...');

            // Check if LLM service supports expansion
            if (!this.llmService.expandIdea) {
                new Notice('Idea expansion is not supported by the current AI provider.');
                return;
            }

            const expansion = await this.llmService.expandIdea(ideaText, {
                category: frontmatter.category,
                tags: frontmatter.tags,
                detailLevel: 'detailed',
            });

            // Show preview modal
            new ExpansionPreviewModal(
                this.app,
                expansion,
                async (action) => {
                    if (action === 'append') {
                        await this.fileManager.appendToFileBody(file, 'Expanded Idea', expansion.expandedText);
                        new Notice('Expanded content added to note.');
                    } else if (action === 'replace') {
                        const { content } = await this.readIdeaContent(file);
                        const parsed = this.frontmatterParser.parse(content);
                        const newContent = this.frontmatterParser.build(parsed.frontmatter, expansion.expandedText);
                        await this.app.vault.modify(file, newContent);
                        new Notice('Idea content replaced with expanded version.');
                    }
                }
            ).open();
        } catch (error) {
            console.error('Failed to expand idea:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to expand idea. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: reorganize-idea
     * Reorganize idea into structured format
     */
    private async reorganizeIdea(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.llmService.isAvailable()) {
                new Notice('AI service is not configured. Please set up AI in settings.');
                return;
            }

            const { body, frontmatter, content } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Reorganizing idea...');

            // Check if LLM service supports reorganization
            if (!this.llmService.reorganizeIdea) {
                new Notice('Idea reorganization is not supported by the current AI provider.');
                return;
            }

            // Create backup file
            const backupPath = file.path.replace(/\.md$/, '.backup.md');
            try {
                await this.app.vault.create(backupPath, content);
            } catch (error) {
                console.warn('Failed to create backup file:', error);
                // Continue anyway
            }

            const reorganization = await this.llmService.reorganizeIdea(ideaText, {
                category: frontmatter.category,
                tags: frontmatter.tags,
            });

            // Show preview modal with before/after comparison
            new ReorganizationPreviewModal(
                this.app,
                ideaText,
                reorganization,
                async (action) => {
                    if (action === 'accept') {
                        const parsed = this.frontmatterParser.parse(content);
                        const newContent = this.frontmatterParser.build(parsed.frontmatter, reorganization.reorganizedText);
                        await this.app.vault.modify(file, newContent);
                        new Notice('Idea reorganized successfully.');
                    } else if (action === 'reject') {
                        new Notice('Reorganization cancelled.');
                    }
                }
            ).open();
        } catch (error) {
            console.error('Failed to reorganize idea:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to reorganize idea. Please try again or check console for details.');
            }
        }
    }

    // ============================================================================
    // Status & Lifecycle Commands - Command Handlers
    // ============================================================================

    /**
     * Command: change-status
     * Change idea status with picker modal
     */
    private async changeStatus(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            const { frontmatter } = await this.readIdeaContent(file);
            const currentStatusStr = (frontmatter.status as string) || 'captured';

            // Show status picker modal
            new StatusPickerModal(
                this.app,
                currentStatusStr,
                async (newStatus: IdeaStatus) => {
                    await this.updateIdeaFrontmatter(file, { status: newStatus });

                    // Handle file movement based on status
                    // Check if previous status was archived (cast to any to avoid type narrowing)
                    const prevStatus: any = frontmatter.status;
                    const wasArchived = prevStatus === 'archived';
                    const isNowArchived = (newStatus as string) === 'archived';
                    if (isNowArchived) {
                        await this.fileOrganizer.moveToArchive(file);
                    } else if (wasArchived && !isNowArchived) {
                        await this.fileOrganizer.moveFromArchive(file);
                    }

                    new Notice(`Status changed to ${newStatus}`);
                }
            ).open();
        } catch (error) {
            console.error('Failed to change status:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to change status. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: archive-idea
     * Archive the current idea
     */
    private async archiveIdea(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            // Update status to archived
            await this.updateIdeaFrontmatter(file, { status: 'archived' });

            // Move to archive directory if enabled
            await this.fileOrganizer.moveToArchive(file);

            new Notice('Idea archived successfully.');
        } catch (error) {
            console.error('Failed to archive idea:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to archive idea. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: unarchive-idea
     * Unarchive the current idea
     */
    private async unarchiveIdea(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            const { frontmatter } = await this.readIdeaContent(file);
            
            // Determine previous status (default to 'captured' if not available)
            const previousStatus = frontmatter.status === 'archived' ? 'captured' : frontmatter.status || 'captured';

            // Update status from archived
            await this.updateIdeaFrontmatter(file, { status: previousStatus });

            // Move from archive if enabled
            await this.fileOrganizer.moveFromArchive(file);

            new Notice('Idea unarchived successfully.');
        } catch (error) {
            console.error('Failed to unarchive idea:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to unarchive idea. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: add-codename
     * Generate or update codename for the current idea
     */
    private async addCodename(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) {
                new Notice('No active idea file. Please open an idea file.');
                return;
            }

            const { frontmatter, body } = await this.readIdeaContent(file);
            
            // Check if LLM is available
            if (!this.llmService?.isAvailable() || !this.llmService.complete) {
                new Notice('LLM service is not available. Cannot generate codename.');
                return;
            }

            // Extract idea name/title for context
            const ideaName = extractIdeaNameRuleBased(body);
            const ideaText = ideaName ? `${ideaName}\n\n${body}` : body;

            // Generate codename automatically
            new Notice('Generating codename...');
            
            const codename = await this.generateCodename(ideaText);
            
            if (!codename) {
                new Notice('Failed to generate codename. Please try again.');
                return;
            }

            // Update frontmatter with generated codename
            const updates: Partial<any> = {
                codename: codename.trim()
            };

            await this.updateIdeaFrontmatter(file, updates);

            // Update filename
            const createdDate = new Date(frontmatter.created);
            const sanitizedCodename = sanitizeTitle(codename.trim());
            const dateStr = formatDate(createdDate);
            const newFilename = `${dateStr} ${sanitizedCodename}.md`;

            // Rename file if filename changed
            const currentFilename = file.name;
            if (currentFilename !== newFilename) {
                const directory = file.path.substring(0, file.path.lastIndexOf('/') + 1);
                const newPath = directory + newFilename;
                await this.app.vault.rename(file, newPath);
            }

            new Notice(`Codename "${codename}" generated successfully.`);
        } catch (error) {
            console.error('Failed to generate codename:', error);
            
            // Check for specific error types
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else if (error instanceof NetworkError || error instanceof ClassificationError) {
                // Check the underlying cause for connection errors
                const cause = (error as ClassificationError).cause;
                if (cause && (cause.message.includes('CONNECTION_REFUSED') || 
                             cause.message.includes('Failed to fetch'))) {
                    new Notice('LLM service is not running. Please start your local LLM server or configure a cloud provider.');
                } else if (error instanceof APITimeoutError) {
                    new Notice('LLM request timed out. Please try again.');
                } else if (error instanceof NetworkError) {
                    new Notice('Network error connecting to LLM service. Please check your connection and try again.');
                } else {
                    new Notice('Failed to generate codename. Please check that your LLM service is running.');
                }
            } else if (error instanceof Error) {
                // Check for connection errors in message
                if (error.message.includes('CONNECTION_REFUSED') || 
                    error.message.includes('Failed to fetch') ||
                    error.name === 'TypeError') {
                    new Notice('LLM service is not running. Please start your local LLM server or configure a cloud provider.');
                } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                    new Notice('LLM request timed out. Please try again.');
                } else {
                    new Notice(`Failed to generate codename: ${error.message}`);
                }
            } else {
                new Notice('Failed to generate codename. Please check that your LLM service is running.');
            }
        }
    }

    /**
     * Generate a codename using LLM
     */
    private async generateCodename(ideaText: string): Promise<string | null> {
        if (!this.llmService?.complete) {
            return null;
        }

        const prompt = `Generate a codename for this idea.

Idea: "${ideaText.substring(0, 500)}"

Requirements:
- 1-3 words maximum
- Easy to remember and pronounce
- Captures the idea's core concept
- Professional but creative
- Suitable for filenames

Examples:
- "bracelet that measures room volume" → "VolumeBand" or "SoundSense"
- "AI writing assistant" → "WriteBot" or "TextCraft"
- "social network for developers" → "DevNet" or "CodeConnect"

Return only the codename. No quotes, no explanation, just the name:`;

        try {
            const response = await this.llmService.complete(prompt, {
                temperature: 0.8,
                n_predict: 50,
                stop: ['\n', '.', '!', '?', '"', "'"]
            });

            // Clean and validate the response
            let codename = response.trim();
            
            // Remove quotes if present
            codename = codename.replace(/^["']|["']$/g, '');
            
            // Truncate to 30 characters (reasonable for codenames)
            codename = codename.substring(0, 30).trim();
            
            // Remove special characters (keep alphanumeric, spaces, hyphens)
            codename = codename.replace(/[^a-zA-Z0-9\s-]/g, '');
            
            // Validate: must be at least 2 characters
            if (codename.length < 2) {
                return null;
            }
            
            return codename;
        } catch (error) {
            console.error('Codename generation failed:', error);
            // Re-throw to be handled by caller with better error messages
            throw error;
        }
    }

    // ============================================================================
    // Batch Operations Commands - Command Handlers
    // ============================================================================

    /**
     * Command: reclassify-all-ideas
     * Reclassify all ideas in the Ideas/ directory
     */
    private async reclassifyAllIdeas(): Promise<void> {
        try {
            // Get all idea files
            const allFiles = this.app.vault.getMarkdownFiles();
            const ideaFiles = allFiles.filter(file => file.path.startsWith('Ideas/') && !file.path.startsWith('Ideas/Archived/'));

            if (ideaFiles.length === 0) {
                new Notice('No idea files found in Ideas/ directory.');
                return;
            }

            if (!this.classificationService.isAvailable()) {
                new Notice('Classification service is not available. Please configure AI in settings.');
                return;
            }

            // Create progress modal
            const progressModal = new ProgressModal(
                this.app,
                'Reclassifying Ideas'
            );
            progressModal.open();

            let completed = 0;
            let failed = 0;
            const errors: string[] = [];

            // Process each idea
            for (let i = 0; i < ideaFiles.length; i++) {
                if (progressModal.isCancelled()) {
                    break;
                }

                const file = ideaFiles[i];
                progressModal.updateProgress({
                    current: i + 1,
                    total: ideaFiles.length,
                    currentItem: file.name,
                    status: 'processing'
                });

                try {
                    const { body } = await this.readIdeaContent(file);
                    const ideaText = body.trim();

                    if (ideaText.length === 0) {
                        errors.push(`${file.name}: No content to classify`);
                        failed++;
                        continue;
                    }

                    // Classify
                    const classification = await this.classificationService.classifyIdea(ideaText);

                    // Update frontmatter
                    await this.updateIdeaFrontmatter(file, {
                        category: classification.category,
                        tags: classification.tags,
                    });

                    completed++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`${file.name}: ${errorMessage}`);
                    failed++;
                }
            }

            // Show summary
            progressModal.updateProgress({
                current: ideaFiles.length,
                total: ideaFiles.length,
                status: progressModal.isCancelled() ? 'cancelled' : 'completed',
                errors: errors.length > 0 ? errors : undefined
            });

            if (!progressModal.isCancelled()) {
                new Notice(`Reclassification complete: ${completed} updated, ${failed} failed`);
            }
        } catch (error) {
            console.error('Failed to reclassify ideas:', error);
            new Notice('Failed to reclassify ideas. Please try again or check console for details.');
        }
    }

    /**
     * Command: find-all-duplicates
     * Find all duplicate pairs across all ideas
     */
    private async findAllDuplicates(): Promise<void> {
        try {
            // Get all idea files
            const allFiles = this.app.vault.getMarkdownFiles();
            const ideaFiles = allFiles.filter(file => file.path.startsWith('Ideas/') && !file.path.startsWith('Ideas/Archived/'));

            if (ideaFiles.length < 2) {
                new Notice('Need at least 2 idea files to find duplicates.');
                return;
            }

            // DuplicateDetector doesn't have isAvailable, it's always available

            new Notice('Scanning for duplicates... This may take a while.');

            const duplicatePairs: Array<{ file1: TFile; file2: TFile; similarity: number }> = [];

            // Compare all pairs
            for (let i = 0; i < ideaFiles.length; i++) {
                for (let j = i + 1; j < ideaFiles.length; j++) {
                    const file1 = ideaFiles[i];
                    const file2 = ideaFiles[j];

                    try {
                        const { body: body1 } = await this.readIdeaContent(file1);
                        const { body: body2 } = await this.readIdeaContent(file2);

                        // Compare the two files directly
                        // We'll use a simple similarity check for now
                        const similarity = this.searchService.calculateSimilarity(body1, body2);
                        
                        if (similarity > 0.75) {
                            duplicatePairs.push({
                                file1,
                                file2,
                                similarity
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to compare ${file1.name} and ${file2.name}:`, error);
                        // Continue with other pairs
                    }
                }
            }

            if (duplicatePairs.length === 0) {
                new Notice('No duplicates found.');
                return;
            }

            // Show modal with duplicate pairs
            const modal = new DuplicatePairsModal(
                this.app,
                duplicatePairs,
                {
                    onBulkAction: async (pairs: DuplicatePair[], action: BulkAction) => {
                        for (const pair of pairs) {
                            try {
                                if (action === 'link') {
                                    await this.linkDuplicatePair(pair);
                                } else if (action === 'archive') {
                                    await this.archiveDuplicatePair(pair);
                                } else if (action === 'merge') {
                                    await this.mergeDuplicatePair(pair);
                                }
                            } catch (error) {
                                console.error(`Failed to ${action} pair:`, error);
                            }
                        }
                        new Notice(`Applied ${action} to ${pairs.length} pair${pairs.length > 1 ? 's' : ''}.`);
                        modal.close();
                    },
                    onLink: async (pair: DuplicatePair) => {
                        await this.linkDuplicatePair(pair);
                        new Notice('Duplicates linked in frontmatter.');
                    },
                    onArchive: async (pair: DuplicatePair) => {
                        await this.archiveDuplicatePair(pair);
                        new Notice('Duplicate archived.');
                    },
                    onMerge: async (pair: DuplicatePair) => {
                        await this.mergeDuplicatePair(pair);
                        new Notice('Duplicates merged.');
                    }
                }
            );
            modal.open();
        } catch (error) {
            console.error('Failed to find duplicates:', error);
            new Notice('Failed to find duplicates. Please try again or check console for details.');
        }
    }

    /**
     * Helper: Link duplicate pair in frontmatter
     */
    private async linkDuplicatePair(pair: DuplicatePair): Promise<void> {
        // Add each file to the other's related field
        const { frontmatter: fm1 } = await this.readIdeaContent(pair.file1);
        const { frontmatter: fm2 } = await this.readIdeaContent(pair.file2);

        const related1 = Array.isArray(fm1.related) ? [...fm1.related] : [];
        const related2 = Array.isArray(fm2.related) ? [...fm2.related] : [];

        if (!related1.includes(pair.file2.path)) {
            related1.push(pair.file2.path);
        }
        if (!related2.includes(pair.file1.path)) {
            related2.push(pair.file1.path);
        }

        await this.updateIdeaFrontmatter(pair.file1, { related: related1 });
        await this.updateIdeaFrontmatter(pair.file2, { related: related2 });
    }

    /**
     * Helper: Archive one file from duplicate pair
     */
    private async archiveDuplicatePair(pair: DuplicatePair): Promise<void> {
        // Archive the second file (user could choose which, but for simplicity we archive file2)
        await this.fileOrganizer.moveToArchive(pair.file2);
        await this.updateIdeaFrontmatter(pair.file2, { status: 'archived' });
    }

    /**
     * Helper: Merge duplicate pair (combine content, keep file1, delete file2)
     */
    private async mergeDuplicatePair(pair: DuplicatePair): Promise<void> {
        const { body: body1, frontmatter: fm1 } = await this.readIdeaContent(pair.file1);
        const { body: body2, frontmatter: fm2 } = await this.readIdeaContent(pair.file2);

        // Combine bodies with separator
        const mergedBody = `${body1}\n\n---\n\nMerged from: ${pair.file2.name}\n\n${body2}`;

        // Merge frontmatter (combine tags, related, etc.)
        const mergedTags = [
            ...(Array.isArray(fm1.tags) ? fm1.tags : []),
            ...(Array.isArray(fm2.tags) ? fm2.tags : [])
        ];
        const uniqueTags = Array.from(new Set(mergedTags));

        const mergedRelated = [
            ...(Array.isArray(fm1.related) ? fm1.related : []),
            ...(Array.isArray(fm2.related) ? fm2.related : []),
            pair.file2.path
        ];
        const uniqueRelated = Array.from(new Set(mergedRelated));

        // Update file1 with merged content
        const updatedFrontmatter = {
            ...fm1,
            tags: uniqueTags,
            related: uniqueRelated
        };
        const updatedContent = this.frontmatterParser.build(updatedFrontmatter, mergedBody);
        await this.app.vault.modify(pair.file1, updatedContent);

        // Delete file2
        await this.app.vault.delete(pair.file2);
    }

    /**
     * Command: refresh-all-related-notes
     * Refresh related notes for all ideas
     */
    private async refreshAllRelatedNotes(): Promise<void> {
        try {
            // Get all idea files
            const allFiles = this.app.vault.getMarkdownFiles();
            const ideaFiles = allFiles.filter(file => file.path.startsWith('Ideas/') && !file.path.startsWith('Ideas/Archived/'));

            if (ideaFiles.length === 0) {
                new Notice('No idea files found in Ideas/ directory.');
                return;
            }

            // SearchService doesn't have isAvailable, it's always available

            // Create progress modal
            const progressModal = new ProgressModal(
                this.app,
                'Refreshing Related Notes'
            );
            progressModal.open();

            let completed = 0;
            let failed = 0;
            const errors: string[] = [];

            // Process each idea
            for (let i = 0; i < ideaFiles.length; i++) {
                if (progressModal.isCancelled()) {
                    break;
                }

                const file = ideaFiles[i];
                progressModal.updateProgress({
                    current: i + 1,
                    total: ideaFiles.length,
                    currentItem: file.name,
                    status: 'processing'
                });

                try {
                    const { body } = await this.readIdeaContent(file);
                    const ideaText = body.trim();

                    if (ideaText.length === 0) {
                        errors.push(`${file.name}: No content to search`);
                        failed++;
                        continue;
                    }

                    // Find related notes
                    const related = await this.searchService.findRelatedNotes(ideaText, 5);

                    // Update frontmatter with related notes
                    const relatedPaths = related.map(r => r.path);
                    await this.updateIdeaFrontmatter(file, {
                        related: relatedPaths
                    });

                    completed++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`${file.name}: ${errorMessage}`);
                    failed++;
                }
            }

            // Show summary
            progressModal.updateProgress({
                current: ideaFiles.length,
                total: ideaFiles.length,
                status: progressModal.isCancelled() ? 'cancelled' : 'completed',
                errors: errors.length > 0 ? errors : undefined
            });

            if (!progressModal.isCancelled()) {
                new Notice(`Refresh complete: ${completed} updated, ${failed} failed`);
            }
        } catch (error) {
            console.error('Failed to refresh related notes:', error);
            new Notice('Failed to refresh related notes. Please try again or check console for details.');
        }
    }

    // ============================================================================
    // Analysis & Insights Commands - Command Handlers
    // ============================================================================

    /**
     * Command: find-tenuous-links
     * Find unexpected connections between ideas
     */
    private async findTenuousLinks(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.tenuousLinkService) {
                new Notice('Tenuous link service is not available.');
                return;
            }

            const { body, frontmatter } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            new Notice('Finding tenuous links... This may take a moment.');

            const links = await this.tenuousLinkService.findTenuousLinks(
                ideaText,
                frontmatter.category || '',
                frontmatter.tags || [],
                frontmatter.related || []
            );

            if (links.length === 0) {
                new Notice('No tenuous links found.');
                return;
            }

            // Show modal with links
            new TenuousLinksModal(
                this.app,
                links,
                async (link, action) => {
                    if (action === 'link') {
                        // Add to related notes
                        const currentRelated = frontmatter.related || [];
                        if (!currentRelated.includes(link.idea.path)) {
                            await this.updateIdeaFrontmatter(file, {
                                related: [...currentRelated, link.idea.path]
                            });
                            new Notice(`Linked to ${link.idea.title}`);
                        }
                    } else if (action === 'combine') {
                        // Create combined idea
                        const combinedContent = `---
type: idea
status: captured
created: ${new Date().toISOString().split('T')[0]}
category: ${frontmatter.category || ''}
tags: ${JSON.stringify([...(frontmatter.tags || []), 'combined'])}
related: ${JSON.stringify([file.path, link.idea.path])}
domains: []
existence-check: []
---

# Combined Idea

## Original Idea
${ideaText}

## Linked Idea
${link.explanation}

## Synergy
${link.synergy || 'Potential combination of these ideas'}
`;
                        const newPath = `Ideas/${new Date().toISOString().split('T')[0]}-combined-idea.md`;
                        await this.app.vault.create(newPath, combinedContent);
                        new Notice('Created combined idea.');
                    }
                }
            ).open();
        } catch (error) {
            console.error('Failed to find tenuous links:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to find tenuous links. Please try again or check console for details.');
            }
        }
    }

    /**
     * Command: analyze-idea-cluster
     * Analyze the cluster containing the current idea
     */
    private async analyzeIdeaCluster(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            if (!this.clusteringService) {
                new Notice('Clustering service is not available.');
                return;
            }

            new Notice('Analyzing cluster...');

            // Get all ideas
            const allFiles = this.app.vault.getMarkdownFiles();
            const ideaFiles = allFiles.filter(f => 
                f.path.startsWith('Ideas/') && !f.path.startsWith('Ideas/Archived/')
            );

            if (ideaFiles.length === 0) {
                new Notice('No idea files found.');
                return;
            }

            // Parse all ideas
            const ideas = [];
            for (const ideaFile of ideaFiles) {
                try {
                    const content = await this.app.vault.read(ideaFile);
                    const parsed = this.frontmatterParser.parseIdeaFile(
                        { path: ideaFile.path, name: ideaFile.name },
                        content
                    );
                    ideas.push(parsed);
                } catch (error) {
                    console.warn(`Failed to parse ${ideaFile.path}:`, error);
                }
            }

            // Cluster ideas
            const clusters = await this.clusteringService.clusterIdeas(ideas);

            // Find cluster containing current idea
            const currentCluster = clusters.find(c => 
                c.ideas.some(i => i.filename === file.name || `Ideas/${i.filename}` === file.path)
            );

            if (!currentCluster) {
                new Notice('Could not find cluster for this idea.');
                return;
            }

            // Calculate common tags
            const allTags = new Map<string, number>();
            currentCluster.ideas.forEach(idea => {
                const tags = idea.frontmatter?.tags || [];
                tags.forEach(tag => {
                    allTags.set(tag, (allTags.get(tag) || 0) + 1);
                });
            });
            const commonTags = Array.from(allTags.entries())
                .filter(([_, count]) => count >= 2)
                .sort((a, b) => b[1] - a[1])
                .map(([tag]) => tag)
                .slice(0, 10);

            // Calculate statistics
            const ages = currentCluster.ideas.map(idea => {
                const created = idea.frontmatter?.created 
                    ? new Date(idea.frontmatter.created).getTime()
                    : Date.now();
                return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
            });
            const averageAge = ages.reduce((a, b) => a + b, 0) / ages.length;

            const statusDistribution: Record<string, number> = {};
            currentCluster.ideas.forEach(idea => {
                const status = idea.frontmatter?.status || 'unknown';
                statusDistribution[status] = (statusDistribution[status] || 0) + 1;
            });

            // Calculate actual similarity between clusters using embeddings
            const relatedClusters = await Promise.all(
                clusters
                    .filter(c => c !== currentCluster)
                    .map(async (otherCluster) => {
                        // Calculate cluster-to-cluster similarity
                        let totalSimilarity = 0;
                        let comparisons = 0;

                        // Compare each idea in current cluster with each idea in other cluster
                        for (const idea1 of currentCluster.ideas) {
                            for (const idea2 of otherCluster.ideas) {
                                const body1 = idea1.body || idea1.filename || '';
                                const body2 = idea2.body || idea2.filename || '';
                                
                                if (body1 && body2) {
                                    const similarity = this.searchService.calculateSimilarity(body1, body2);
                                    totalSimilarity += similarity;
                                    comparisons++;
                                }
                            }
                        }

                        const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

                        return {
                            label: otherCluster.label,
                            similarity: avgSimilarity,
                            cluster: otherCluster
                        };
                    })
            );

            // Filter and sort by similarity
            const filteredRelated = relatedClusters
                .filter(c => c.similarity > 0.3) // Only show clusters with meaningful similarity
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5)
                .map(c => ({
                    label: c.label,
                    similarity: c.similarity
                }));

            // Use LLM to analyze cluster themes and relationships if available
            let commonThemes: string[] = [];
            let relationshipExplanations: Map<string, string> = new Map();

            if (this.llmService.isAvailable() && this.llmService.complete) {
                try {
                    // Analyze current cluster themes
                    const clusterIdeasForAnalysis = currentCluster.ideas.map(idea => ({
                        title: idea.filename.replace('.md', ''),
                        text: idea.body || '',
                        category: idea.frontmatter?.category || '',
                        tags: idea.frontmatter?.tags || []
                    }));

                    const analysisPrompt = PROMPTS.clusterAnalysis({
                        clusterIdeas: clusterIdeasForAnalysis
                    });

                    const analysisResponse = await this.llmService.complete(analysisPrompt, {
                        temperature: 0.7,
                        n_predict: 500
                    });

                    // Parse JSON response
                    const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const analysis = JSON.parse(jsonMatch[0]);
                        commonThemes = analysis.commonThemes || [];
                    }

                    // Analyze relationships to top related clusters
                    for (const relatedCluster of filteredRelated.slice(0, 3)) {
                        const otherCluster = relatedClusters.find(c => c.label === relatedCluster.label)?.cluster;
                        if (otherCluster) {
                            const otherClusterIdeas = otherCluster.ideas.map(idea => ({
                                title: idea.filename.replace('.md', ''),
                                text: idea.body || '',
                                category: idea.frontmatter?.category || '',
                                tags: idea.frontmatter?.tags || []
                            }));

                            const relationshipPrompt = PROMPTS.clusterAnalysis({
                                clusterIdeas: clusterIdeasForAnalysis,
                                otherClusterIdeas: otherClusterIdeas,
                                similarity: relatedCluster.similarity
                            });

                            const relationshipResponse = await this.llmService.complete(relationshipPrompt, {
                                temperature: 0.7,
                                n_predict: 300
                            });

                            const relationshipJsonMatch = relationshipResponse.match(/\{[\s\S]*\}/);
                            if (relationshipJsonMatch) {
                                const relationshipAnalysis = JSON.parse(relationshipJsonMatch[0]);
                                if (relatedCluster.label) {
                                    relationshipExplanations.set(
                                        relatedCluster.label,
                                        relationshipAnalysis.relationshipToOtherCluster || ''
                                    );
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Failed to analyze cluster with LLM:', error);
                    // Continue without LLM analysis
                }
            }

            // Show modal with cluster analysis
            const clusterInfo: ClusterInfo = {
                label: currentCluster.label || 'Unnamed Cluster',
                ideas: currentCluster.ideas,
                commonTags,
                commonThemes: commonThemes.length > 0 ? commonThemes : undefined,
                statistics: {
                    totalIdeas: currentCluster.ideas.length,
                    averageAge,
                    statusDistribution
                },
                relatedClusters: filteredRelated.map(c => ({
                    label: c.label || 'Unnamed Cluster',
                    similarity: c.similarity,
                    explanation: relationshipExplanations.get(c.label || '')
                })).filter(c => c.label !== 'Unnamed Cluster' || c.similarity > 0)
            };

            new ClusterAnalysisModal(
                this.app,
                clusterInfo,
                async (path: string) => {
                    const file = this.app.vault.getAbstractFileByPath(path || '');
                    if (file) {
                        await this.app.workspace.openLinkText(path || '', '', true);
                    }
                }
            ).open();
        } catch (error) {
            console.error('Failed to analyze cluster:', error);
            new Notice('Failed to analyze cluster. Please try again or check console for details.');
        }
    }

    /**
     * Command: show-idea-stats
     * Show statistics for the current idea
     */
    private async showIdeaStats(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            const { frontmatter } = await this.readIdeaContent(file);

            // Calculate stats
            const created = frontmatter.created ? new Date(frontmatter.created) : new Date(file.stat.mtime);
            const age = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)); // days
            const relatedCount = (frontmatter.related || []).length;
            const tagsCount = (frontmatter.tags || []).length;
            const domainsCount = (frontmatter.domains || []).length;
            const lastModified = new Date(file.stat.mtime);

            // Show modal with statistics
            const stats: IdeaStats = {
                age,
                status: frontmatter.status || 'unknown',
                category: frontmatter.category || 'none',
                relatedCount,
                tagsCount,
                domainsCount,
                lastModified,
                created,
                frontmatter
            };

            new IdeaStatsModal(this.app, stats).open();
        } catch (error) {
            console.error('Failed to show idea stats:', error);
            new Notice('Failed to show idea statistics. Please try again or check console for details.');
        }
    }

    // ============================================================================
    // Quick Actions Commands - Command Handlers
    // ============================================================================

    /**
     * Command: refresh-idea
     * Refresh all aspects of the current idea
     */
    private async refreshIdea(): Promise<void> {
        try {
            const file = await this.getActiveIdeaFile();
            if (!file) return;

            new Notice('Refreshing idea...');

            const { body } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            const updates: any = {};

            // Re-classify
            if (this.classificationService.isAvailable()) {
                try {
                    const classification = await this.classificationService.classifyIdea(ideaText);
                    updates.category = classification.category;
                    updates.tags = classification.tags;
                } catch (error) {
                    console.warn('Failed to re-classify:', error);
                }
            }

            // Refresh related notes
            try {
                const related = await this.searchService.findRelatedNotes(ideaText, 5);
                updates.related = related.map(r => r.path);
            } catch (error) {
                console.warn('Failed to refresh related notes:', error);
            }

            // Regenerate name variants (if enabled)
            if (this.settings.enableNameVariants && this.nameVariantService.isAvailable()) {
                try {
                    const variants = await this.nameVariantService.generateVariants(ideaText);
                    if (variants.length > 0) {
                        // Append variants to file body
                        const variantsText = this.nameVariantService.formatVariantsForMarkdown(variants);
                        await this.fileManager.appendToFileBody(file, 'Name Variants', variantsText);
                    }
                } catch (error) {
                    console.warn('Failed to regenerate name variants:', error);
                }
            }

            // Update frontmatter
            if (Object.keys(updates).length > 0) {
                await this.updateIdeaFrontmatter(file, updates);
            }

            new Notice('Idea refreshed successfully.');
        } catch (error) {
            console.error('Failed to refresh idea:', error);
            if (error instanceof UserFacingError) {
                new Notice(error.userMessage);
            } else {
                new Notice('Failed to refresh idea. Please try again or check console for details.');
            }
        }
    }

    // ============================================================================
    // Export & Import Commands - Command Handlers
    // ============================================================================

    /**
     * Command: export-ideas
     * Export all ideas to selected format
     */
    private async exportIdeas(): Promise<void> {
        try {
            // For now, default to JSON. In a full implementation, we'd show a format picker
            const format: ExportFormat = 'json';

            new Notice('Exporting ideas...');

            const exportContent = await this.exportService.exportIdeas(format);

            // Create export file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `Ideatr-Export-${timestamp}.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'}`;
            const path = `Ideas/${filename}`;

            await this.app.vault.create(path, exportContent);

            new Notice(`Exported ${filename} successfully.`);
        } catch (error) {
            console.error('Failed to export ideas:', error);
            new Notice('Failed to export ideas. Please try again or check console for details.');
        }
    }

    /**
     * Command: import-ideas
     * Import ideas from file
     */
    private async importIdeas(): Promise<void> {
        try {
            // Check service availability
            if (!this.importService) {
                new Notice('Import service is not available.');
                return;
            }

            // Show file picker modal
            new ImportFilePickerModal(
                this.app,
                ['json', 'csv', 'md'],
                async (importFile: TFile) => {
                    // Detect format from file extension
                    let format: 'json' | 'csv' | 'markdown' = 'json';
                    const ext = importFile.extension?.toLowerCase() || '';
                    if (ext === 'json') {
                        format = 'json';
                    } else if (ext === 'csv') {
                        format = 'csv';
                    } else if (ext === 'md' || ext === 'markdown') {
                        format = 'markdown';
                    } else {
                        new Notice(`Unsupported file format: ${ext}. Please use JSON, CSV, or Markdown files.`);
                        return;
                    }

                    try {
                        // Read file content
                        const content = await this.app.vault.read(importFile);

                        // Show progress modal
                        const progressModal = new ProgressModal(this.app, 'Importing Ideas');
                        progressModal.open();

                        // Import ideas
                        progressModal.updateProgress({
                            current: 0,
                            total: 1,
                            currentItem: `Parsing ${importFile.name}...`,
                            status: 'processing'
                        });

                        const result = await this.importService.importIdeas(content, format);

                        progressModal.updateProgress({
                            current: result.total,
                            total: result.total,
                            status: result.failed === 0 ? 'completed' : 'completed',
                            errors: result.errors.length > 0 ? result.errors.map(e => `${e.item}: ${e.error}`) : undefined
                        });

                        // Show summary
                        if (result.imported > 0) {
                            new Notice(`Import complete: ${result.imported} imported, ${result.failed} failed${result.errors.length > 0 ? '. Check console for details.' : '.'}`);
                        } else {
                            new Notice(`Import failed: ${result.failed} failed. Check console for details.`);
                        }

                        // Close progress modal after a short delay
                        setTimeout(() => {
                            progressModal.close();
                        }, 2000);
                    } catch (error) {
                        console.error('Failed to import ideas:', error);
                        new Notice('Failed to import ideas. Please try again or check console for details.');
                    }
                }
            ).open();
        } catch (error) {
            console.error('Failed to show import file picker:', error);
            new Notice('Failed to show import file picker. Please try again or check console for details.');
        }
    }

    /**
     * Extract body text from file (remove frontmatter)
     */
    private extractBodyFromFile(content: string): string {
        const frontmatterRegex = /^---\n[\s\S]*?\n---\n\n?/;
        return content.replace(frontmatterRegex, '').trim();
    }

    /**
     * Open dashboard view
     */
    private async openDashboard(): Promise<void> {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.setViewState({
            type: 'ideatr-dashboard',
            active: true
        });
    }

    /**
     * Open graph view
     */
    private async openGraphView(): Promise<void> {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.setViewState({
            type: 'ideatr-graph',
            active: true
        });
    }

    /**
     * Generate weekly digest
     */
    private async generateDigest(): Promise<void> {
        try {
            new Notice('Generating digest...');
            const digest = await this.resurfacingService.generateDigest();
            
            // For v1, open digest in a new note
            // In v2, we'd show it in a modal or dedicated view
            const digestContent = digest.summary;
            const digestPath = `Ideas/.ideatr-digest-${Date.now()}.md`;
            
            await this.app.vault.create(digestPath, digestContent);
            new Notice(`Digest generated: ${digest.ideas.length} ideas`);
            
            // Open the digest file
            const file = this.app.vault.getAbstractFileByPath(digestPath);
            if (file) {
                await this.app.workspace.openLinkText(digestPath, '', false);
            }
        } catch (error) {
            console.error('Failed to generate digest:', error);
            new Notice('Failed to generate digest. Please try again.');
        }
    }

    /**
     * Elevate idea to project
     */
    private async elevateToProject(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (!activeFile) {
            new Notice('No active note. Please open an idea file.');
            return;
        }
        
        // Check if file is in Ideas/ directory
        if (!activeFile.path.startsWith('Ideas/')) {
            new Notice('This command works with idea files in the Ideas/ directory.');
            return;
        }
        
        try {
            // Read file content
            const content = await this.app.vault.read(activeFile);
            
            // Parse idea file
            const ideaFile = this.frontmatterParser.parseIdeaFile(
                { path: activeFile.path, name: activeFile.name },
                content
            );
            
            // Validate idea can be elevated
            if (!this.projectElevationService.canElevate(ideaFile)) {
                new Notice('This idea cannot be elevated. It may already be elevated or have invalid frontmatter.');
                return;
            }
            
            // Show confirmation (simple for v1, can be enhanced with modal in v2)
            const projectName = this.projectElevationService.generateProjectName(ideaFile);
            const confirmed = confirm(
                `Elevate idea to project?\n\n` +
                `Project name: ${projectName}\n\n` +
                `The idea file will be moved to Projects/${projectName}/README.md\n` +
                `Original file will be deleted.`
            );
            
            if (!confirmed) {
                return;
            }
            
            // Elevate idea
            new Notice('Elevating idea to project...');
            const result = await this.projectElevationService.elevateIdea(ideaFile);
            
            if (result.success) {
                new Notice(`Idea elevated to project: ${result.projectPath}`);
                
                // Refresh idea repository cache
                await this.ideaRepository.refresh();
                
                // Open the new project README
                const projectReadme = this.app.vault.getAbstractFileByPath(`${result.projectPath}/README.md`);
                if (projectReadme) {
                    await this.app.workspace.openLinkText(`${result.projectPath}/README.md`, '', false);
                }
            } else {
                new Notice(`Failed to elevate idea: ${result.error || 'Unknown error'}`);
                if (result.warnings && result.warnings.length > 0) {
                    console.warn('Elevation warnings:', result.warnings);
                }
            }
        } catch (error) {
            console.error('Failed to elevate idea:', error);
            new Notice('Failed to elevate idea. Please try again.');
        }
    }
}
