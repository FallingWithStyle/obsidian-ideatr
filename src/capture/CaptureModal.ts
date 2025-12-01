import { Modal, App, Notice, TFile } from 'obsidian';
import { validateIdeaText } from './InputValidator';
import { FileManager } from '../storage/FileManager';
import { ClassificationService } from '../services/ClassificationService';
import { DuplicateDetector } from '../services/DuplicateDetector';
import { DomainService } from '../services/DomainService';
import { formatDomainResultsForFrontmatter } from '../services/DomainFormatter';
import { WebSearchService } from '../services/WebSearchService';
import { SearchQueryGenerator } from '../services/SearchQueryGenerator';
import { formatSearchResultsForFrontmatter } from '../services/SearchResultFormatter';
import { extractIdeaNameRuleBased } from '../utils/ideaNameExtractor';
import type { INameVariantService } from '../types/transformation';
import type { IdeatrSettings } from '../settings';
import type { IdeaClassification, ClassificationResult } from '../types/classification';
import type { IdeaCategory } from '../types/classification';
import { ClassificationResultsModal } from '../views/ClassificationResultsModal';
import { Logger } from '../utils/logger';

/**
 * CaptureModal - Modal UI for capturing ideas
 */
export class CaptureModal extends Modal {
    private inputEl!: HTMLTextAreaElement;
    private errorEl!: HTMLDivElement;
    private classificationEl!: HTMLDivElement;
    private fileManager: FileManager;
    private classificationService: ClassificationService;
    private duplicateDetector: DuplicateDetector;
    private domainService: DomainService;
    private webSearchService: WebSearchService;
    private searchQueryGenerator: SearchQueryGenerator;
    private nameVariantService?: INameVariantService;
    private settings: IdeatrSettings;
    private onSuccess?: () => void;
    private isWarningShown: boolean = false;
    private duplicatePaths: string[] = [];
    private classificationAbortController: AbortController | null = null;
    private isFirstClassification: boolean = true;

    constructor(
        app: App,
        fileManager: FileManager,
        classificationService: ClassificationService,
        duplicateDetector: DuplicateDetector,
        settings: IdeatrSettings,
        domainService: DomainService,
        webSearchService: WebSearchService,
        nameVariantService?: INameVariantService,
        onSuccess?: () => void
    ) {
        super(app);
        this.fileManager = fileManager;
        this.classificationService = classificationService;
        this.duplicateDetector = duplicateDetector;
        this.domainService = domainService;
        this.webSearchService = webSearchService;
        this.searchQueryGenerator = new SearchQueryGenerator();
        this.nameVariantService = nameVariantService;
        this.settings = settings;
        this.onSuccess = onSuccess;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-capture-modal');

        // Title
        contentEl.createEl('h2', { text: 'Capture Idea' });

        // Input textarea
        this.inputEl = contentEl.createEl('textarea', {
            attr: {
                placeholder: 'Type your idea here...',
                rows: '6'
            }
        });
        this.inputEl.addClass('ideatr-input');

        // Error message container
        this.errorEl = contentEl.createEl('div', {
            cls: 'ideatr-error',
            attr: {
                style: 'display: none;'
            }
        });

        // Classification results container (hidden initially)
        this.classificationEl = contentEl.createEl('div', {
            cls: 'ideatr-classification',
            attr: {
                style: 'display: none;'
            }
        });

        // Button container
        const buttonContainer = contentEl.createEl('div', {
            cls: 'ideatr-button-container'
        });

        // Show "Classify Now" button if AI is not configured and setup is not completed
        if (!this.settings.setupCompleted && !this.classificationService.isAvailable()) {
            const classifyButton = buttonContainer.createEl('button', {
                text: 'Classify Now',
                cls: 'mod-cta'
            });
            classifyButton.addEventListener('click', () => this.handleClassifyNow());
        }

        // Save button
        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });
        saveButton.addEventListener('click', () => this.handleSubmit());

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => this.close());

        // Help text about accessing other Ideatr features
        const helpText = contentEl.createEl('div', {
            cls: 'ideatr-help-text'
        });
        helpText.createEl('p', {
            text: '💡 Tip: Access Dashboard, Graph View, and other Ideatr features via Command Palette (Cmd/Ctrl + P)',
            attr: {
                style: 'font-size: 0.85em; color: var(--text-muted); margin-top: 1em; text-align: center;'
            }
        });

        // Focus input
        this.inputEl.focus();

        // Handle Enter key (with Cmd/Ctrl modifier to submit)
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                this.handleSubmit();
            }
            // Reset warning on typing
            if (this.isWarningShown) {
                this.hideError();
                this.isWarningShown = false;
                saveButton.setText('Save');
            }
        });
    }

    async handleClassifyNow() {
        const text = this.inputEl.value;

        // Validate input
        const validation = validateIdeaText(text);
        if (!validation.valid) {
            this.showError(validation.error || 'Invalid input');
            return;
        }

        // Show classification in progress
        this.classificationAbortController = new AbortController();
        this.showClassificationInProgress(this.isFirstClassification);
        this.isFirstClassification = false;

        try {
            const classification = await this.classificationService.classifyIdea(validation.sanitizedText || text);
            if (this.classificationAbortController?.signal.aborted) {
                return; // Classification was cancelled
            }
            this.showClassificationResults(classification, null);
        } catch (error) {
            if (this.classificationAbortController?.signal.aborted) {
                return; // Classification was cancelled
            }
            console.error('Classification failed:', error);
            
            // Show error with manual mode option
            this.classificationEl.empty();
            this.classificationEl.style.display = 'block';
            
            let errorMessage = 'Classification unavailable. Please configure AI in settings.';
            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes('invalid api key') || errorMsg.includes('unauthorized')) {
                    errorMessage = 'Invalid API key. Please check your AI settings.';
                } else if (errorMsg.includes('rate limit')) {
                    errorMessage = 'Rate limit exceeded. Please try again later.';
                } else if (errorMsg.includes('connection_refused') || errorMsg.includes('server not available')) {
                    errorMessage = 'AI server not available. Please configure AI in settings.';
                }
            }
            
            this.classificationEl.createEl('p', { 
                text: errorMessage,
                cls: 'ideatr-classification-error'
            });
            
            // Allow retry
            const retryButton = this.classificationEl.createEl('button', {
                text: 'Retry',
                cls: 'mod-cta'
            });
            retryButton.addEventListener('click', () => {
                this.handleClassifyNow();
            });
        }
    }

    async handleSubmit() {
        const text = this.inputEl.value;

        // Validate input
        const validation = validateIdeaText(text);
        if (!validation.valid) {
            this.showError(validation.error || 'Invalid input');
            return;
        }

        // Check for duplicates if not already warned
        if (!this.isWarningShown) {
            try {
                const duplicateResult = await this.duplicateDetector.checkDuplicate(text);
                if (duplicateResult.isDuplicate) {
                    const count = duplicateResult.duplicates.length;
                    const msg = `Found ${count} similar idea${count > 1 ? 's' : ''}. Press Save again to confirm.`;
                    this.showError(msg, true); // Show as warning
                    this.isWarningShown = true;
                    // Store duplicate paths for linking in frontmatter
                    this.duplicatePaths = duplicateResult.duplicates.map(d => d.path);

                    // Update save button text
                    const saveButton = this.contentEl.querySelector('.mod-cta');
                    if (saveButton) saveButton.textContent = 'Save Anyway';

                    return;
                }
            } catch (error) {
                Logger.warn('Duplicate check failed:', error);
                // Proceed if check fails
            }
        }

        try {
            // Create idea file
            const idea = {
                text: validation.sanitizedText || text,
                timestamp: new Date()
            };

            const file = await this.fileManager.createIdeaFile(idea);

            // Success notification
            new Notice('Idea captured!');

            // Trigger validation in background (non-blocking)
            // Store category for later use in validation
            let ideaCategory: IdeaCategory = '';

            // Hide input and show classification UI if autoClassify is enabled
            if (this.settings.autoClassify) {
                this.classificationAbortController = new AbortController();
                this.showClassificationInProgress(this.isFirstClassification);
                this.isFirstClassification = false;
                
                // Trigger classification
                this.classificationService.classifyIdea(idea.text)
                    .then(classification => {
                        if (this.classificationAbortController?.signal.aborted) {
                            return; // Classification was cancelled
                        }
                        ideaCategory = classification.category;
                        this.showClassificationResults(classification, file);
                        // Trigger validation after classification (to get category)
                        this.triggerValidation(file, idea.text, ideaCategory);
                    })
                    .catch(error => {
                        if (this.classificationAbortController?.signal.aborted) {
                            return; // Classification was cancelled
                        }
                        console.error('Classification failed:', error);
                        this.handleClassificationError(error, file, idea.text);
                    });
            } else {
                // No classification, trigger validation immediately
                this.triggerValidation(file, idea.text, '');
                // Just close
                this.close();
                if (this.onSuccess) {
                    this.onSuccess();
                }
            }
        } catch (error) {
            this.showError('Failed to save idea. Please try again.');
            console.error('Error creating idea file:', error);
        }
    }

    showError(message: string, isWarning: boolean = false) {
        this.errorEl.empty(); // Clear any previous content
        this.errorEl.setText(message); // Use Obsidian's setText method
        this.errorEl.style.display = 'block';
        this.errorEl.style.visibility = 'visible';

        if (isWarning) {
            this.errorEl.addClass('ideatr-warning');
            this.errorEl.removeClass('ideatr-error');
        } else {
            this.errorEl.addClass('ideatr-error');
            this.errorEl.removeClass('ideatr-warning');
        }
    }

    hideError() {
        this.errorEl.style.display = 'none';
        this.errorEl.style.visibility = 'hidden';
        this.errorEl.removeClass('ideatr-warning');
        this.errorEl.removeClass('ideatr-error');
    }

    showClassificationInProgress(isFirstTime: boolean = false) {
        // Hide input area
        this.inputEl.style.display = 'none';
        const buttonContainer = this.contentEl.querySelector('.ideatr-button-container');
        if (buttonContainer) {
            (buttonContainer as HTMLElement).style.display = 'none';
        }

        // Show classification container
        this.classificationEl.empty();
        this.classificationEl.style.display = 'block';
        
        const message = isFirstTime 
            ? 'Loading AI model (first use)... ~10 seconds'
            : 'Classifying idea... ~2-3 seconds';
        
        const statusEl = this.classificationEl.createEl('p', { text: message });
        statusEl.addClass('ideatr-classification-status');
        
        // Add cancellation button
        const cancelButton = this.classificationEl.createEl('button', {
            text: 'Cancel',
            cls: 'ideatr-cancel-classification'
        });
        cancelButton.addEventListener('click', () => {
            this.cancelClassification();
        });
    }

    cancelClassification() {
        if (this.classificationAbortController) {
            this.classificationAbortController.abort();
            this.classificationAbortController = null;
        }
        
        // Show manual mode option
        this.classificationEl.empty();
        this.classificationEl.style.display = 'block';
        this.classificationEl.createEl('p', { 
            text: 'Classification cancelled. Idea saved without classification.',
            cls: 'ideatr-classification-status'
        });
        
        // Show manual mode button
        const manualButton = this.classificationEl.createEl('button', {
            text: 'Continue',
            cls: 'mod-cta'
        });
        manualButton.addEventListener('click', () => {
            this.close();
            if (this.onSuccess) {
                this.onSuccess();
            }
        });
    }

    handleClassificationError(error: unknown, file: TFile, ideaText: string) {
        let errorMessage = 'Classification unavailable. Idea saved without classification.';
        let showManualMode = true;

        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            
            if (errorMsg.includes('connection_refused') || errorMsg.includes('server not available')) {
                errorMessage = 'AI server not available. Idea saved without classification.';
            } else if (errorMsg.includes('invalid api key') || errorMsg.includes('unauthorized')) {
                errorMessage = 'Invalid API key. Please check your AI settings. Idea saved without classification.';
                showManualMode = true;
            } else if (errorMsg.includes('rate limit')) {
                errorMessage = 'Rate limit exceeded. Please try again later. Idea saved without classification.';
            } else if (errorMsg.includes('timeout')) {
                errorMessage = 'Classification timed out. Idea saved without classification.';
            } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
                errorMessage = 'Network error. Idea saved without classification.';
            }
        }

        // Show error message
        this.classificationEl.empty();
        this.classificationEl.style.display = 'block';
        this.classificationEl.createEl('p', { 
            text: errorMessage,
            cls: 'ideatr-classification-error'
        });

        // Always allow manual mode fallback
        if (showManualMode) {
            const manualButton = this.classificationEl.createEl('button', {
                text: 'Continue',
                cls: 'mod-cta'
            });
            manualButton.addEventListener('click', () => {
                this.triggerValidation(file, ideaText, '');
                this.close();
                if (this.onSuccess) {
                    this.onSuccess();
                }
            });
        } else {
            // Auto-close after a delay
            setTimeout(() => {
                this.triggerValidation(file, ideaText, '');
                this.close();
                if (this.onSuccess) {
                    this.onSuccess();
                }
            }, 2000);
        }
    }

    showClassificationResults(classification: IdeaClassification, file: TFile | null) {
        // Convert IdeaClassification to ClassificationResult for the modal
        const classificationResult: ClassificationResult = {
            category: classification.category,
            tags: classification.tags
        };

        // Store related notes and duplicate paths for later use
        const relatedNotes = [...classification.related];
        const duplicatePaths = [...this.duplicatePaths];

        // Use ClassificationResultsModal component
        const resultsModal = new ClassificationResultsModal(
            this.app,
            classificationResult,
            (editedResults: ClassificationResult) => {
                // Accept: Merge edited results with related notes and duplicates
                const finalClassification: IdeaClassification = {
                    category: editedResults.category,
                    tags: editedResults.tags,
                    related: [...new Set([...relatedNotes, ...duplicatePaths])]
                };
                if (file) {
                    this.acceptClassification(finalClassification, file);
                } else {
                    // No file - just show results (for "Classify Now" button)
                    new Notice('Classification complete. Save the idea to apply results.');
                    resultsModal.close();
                }
            },
            () => {
                // Edit: Open note editor (for now, just accept)
                const finalClassification: IdeaClassification = {
                    category: classificationResult.category,
                    tags: classificationResult.tags,
                    related: [...new Set([...relatedNotes, ...duplicatePaths])]
                };
                if (file) {
                    this.acceptClassification(finalClassification, file);
                } else {
                    new Notice('Classification complete. Save the idea to apply results.');
                    resultsModal.close();
                }
            },
            async () => {
                // Retry: Re-run classification
                try {
                    const ideaText = this.inputEl.value;
                    const retryClassification = await this.classificationService.classifyIdea(ideaText);
                    // Close current modal and show new results
                    resultsModal.close();
                    this.showClassificationResults(retryClassification, file);
                } catch (error) {
                    console.error('Retry classification failed:', error);
                    new Notice('Failed to retry classification. Please try again.');
                }
            }
        );

        resultsModal.open();
    }

    acceptClassification(classification: IdeaClassification, file: TFile | null) {
        if (!file) {
            // No file to update - this shouldn't happen, but handle gracefully
            return;
        }
        // Merge duplicates with classification related notes
        const allRelated = [...new Set([...classification.related, ...this.duplicatePaths])];
        
        // Update file with classification results
        this.fileManager.updateIdeaFrontmatter(file, {
            category: classification.category,
            tags: classification.tags,
            related: allRelated
        });

        new Notice('Classification applied');
        this.close();
        if (this.onSuccess) {
            this.onSuccess();
        }
    }

    rejectClassification() {
        // Just close without updating frontmatter
        this.close();
        if (this.onSuccess) {
            this.onSuccess();
        }
    }

    /**
     * Trigger validation (domain check, web search, and name variant generation) in background (non-blocking)
     */
    private async triggerValidation(
        file: TFile,
        ideaText: string,
        category: IdeaCategory
    ): Promise<void> {
        // Extract project name for use in validation services
        const projectName = extractIdeaNameRuleBased(ideaText);

        // Track which validations were attempted
        const shouldCheckDomains = this.settings.enableDomainCheck && this.settings.autoCheckDomains;
        const shouldSearchWeb = this.settings.enableWebSearch && this.settings.autoSearchExistence;
        const shouldGenerateVariants = this.settings.enableNameVariants && 
                                       this.settings.autoGenerateVariants && 
                                       this.nameVariantService?.isAvailable();

        // If no validations are enabled, skip
        if (!shouldCheckDomains && !shouldSearchWeb && !shouldGenerateVariants) {
            return;
        }

        // Run validation checks in parallel with individual error handling
        const domainPromise = shouldCheckDomains
            ? this.domainService.checkDomains(ideaText, projectName)
                .catch(error => {
                    Logger.warn('Domain check failed:', error);
                    // Return error result for storage
                    return null; // Signal that domain check was attempted but failed
                })
            : Promise.resolve(null);

        const searchPromise = shouldSearchWeb
            ? this.performWebSearch(ideaText, category, projectName)
                .catch(error => {
                    Logger.warn('Web search failed:', error);
                    // Return error result for storage
                    return null; // Signal that web search was attempted but failed
                })
            : Promise.resolve(null);

        // Generate name variants in background (non-blocking)
        const variantPromise = shouldGenerateVariants && this.nameVariantService
            ? this.nameVariantService.generateVariants(ideaText)
                .then(variants => {
                    if (variants.length > 0) {
                        const formatted = this.nameVariantService!.formatVariantsForMarkdown(variants);
                        return this.fileManager.appendToFileBody(file, 'Name Variants', formatted);
                    }
                    return Promise.resolve();
                })
                .catch(error => {
                    Logger.warn('Name variant generation failed:', error);
                    // Don't throw - graceful degradation
                })
            : Promise.resolve(null);

        // Wait for all to complete (or fail)
        Promise.all([domainPromise, searchPromise, variantPromise])
            .then(([domainResults, searchResults, _variantResult]) => {
                const updates: any = {};
                
                // Handle domain results
                if (shouldCheckDomains) {
                    if (domainResults === null) {
                        // Domain check failed - store error state
                        updates.domains = ['error: Validation failed'];
                    } else if (domainResults.length > 0) {
                        // Domain check succeeded with results
                        updates.domains = formatDomainResultsForFrontmatter(domainResults);
                    }
                    // If domainResults is empty array, don't update (no domains found is not an error)
                }
                
                // Handle search results
                if (shouldSearchWeb) {
                    if (searchResults === null) {
                        // Web search failed - store error state
                        updates['existence-check'] = ['Search error: Validation failed'];
                    } else if (searchResults.length > 0) {
                        // Web search succeeded with results
                        updates['existence-check'] = formatSearchResultsForFrontmatter(
                            searchResults,
                            this.settings.maxSearchResults,
                            category
                        );
                    }
                    // If searchResults is empty array, don't update (no results found is not an error)
                }
                
                // Update frontmatter if we have updates (including error states)
                if (Object.keys(updates).length > 0) {
                    return this.fileManager.updateIdeaFrontmatter(file, updates);
                }
                return Promise.resolve();
            })
            .catch(error => {
                // This catch handles unexpected errors in the Promise.all itself
                Logger.warn('Validation orchestration failed:', error);
                // Store error state for both validations if they were attempted
                const errorUpdates: any = {};
                if (shouldCheckDomains) {
                    errorUpdates.domains = ['error: Validation failed'];
                }
                if (shouldSearchWeb) {
                    errorUpdates['existence-check'] = ['Search error: Validation failed'];
                }
                if (Object.keys(errorUpdates).length > 0) {
                    this.fileManager.updateIdeaFrontmatter(file, errorUpdates).catch(err => {
                        console.error('Failed to store validation error state:', err);
                    });
                }
            });
    }

    /**
     * Perform web search using query generator
     */
    private async performWebSearch(
        ideaText: string,
        category: IdeaCategory,
        projectName?: string
    ): Promise<any[]> {
        if (!this.webSearchService.isAvailable()) {
            return [];
        }

        try {
            // Generate query from idea text with project name
            const query = this.searchQueryGenerator.generateQuery(ideaText, category, projectName);
            if (!query || query.trim().length === 0) {
                return [];
            }

            // Perform search
            const results = await this.webSearchService.search(
                query,
                category,
                this.settings.maxSearchResults
            );

            return results;
        } catch (error) {
            Logger.warn('Web search failed:', error);
            return [];
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
