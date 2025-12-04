import { Modal, App, Notice, TFile } from 'obsidian';
import { validateIdeaText } from './InputValidator';
import { FileManager } from '../storage/FileManager';
import { ClassificationService } from '../services/ClassificationService';
import { DuplicateDetector } from '../services/DuplicateDetector';
// Domain checking removed - functionality hidden
// import { DomainService } from '../services/DomainService';
// import { formatDomainResultsForFrontmatter } from '../services/DomainFormatter';
import { WebSearchService } from '../services/WebSearchService';
import { SearchQueryGenerator } from '../services/SearchQueryGenerator';
import { formatSearchResultsForFrontmatter } from '../services/SearchResultFormatter';
import { extractIdeaNameRuleBased } from '../utils/ideaNameExtractor';
import type { INameVariantService } from '../types/transformation';
import type { IdeatrSettings } from '../settings';
import type { IdeaClassification, ClassificationResult } from '../types/classification';
import type { IdeaCategory } from '../types/classification';
import type { ILLMService } from '../types/classification';
import { ClassificationResultsModal } from '../views/ClassificationResultsModal';
import { Logger } from '../utils/logger';
import { createHelpIcon } from '../utils/HelpIcon';
import { createModelStatusIndicator } from '../utils/ModelStatusIndicator';
import { createLightbulbIcon } from '../utils/iconUtils';

/**
 * Format keyboard shortcut for display (e.g., "cmd+enter" -> "⌘ Enter")
 */
function formatShortcut(shortcut: string): string {
    return shortcut
        .split('+')
        .map(part => {
            const trimmed = part.trim().toLowerCase();
            if (trimmed === 'cmd' || trimmed === 'meta') return '⌘';
            if (trimmed === 'ctrl') return '⌃';
            if (trimmed === 'alt') return '⌥';
            if (trimmed === 'shift') return '⇧';
            // Capitalize first letter for keys
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        })
        .join(' ');
}

/**
 * Check if a keyboard event matches a shortcut string
 */
function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
    const parts = shortcut.toLowerCase().split('+').map(p => p.trim());
    const key = e.key.toLowerCase();
    
    // Check modifiers
    const hasCmd = parts.includes('cmd') || parts.includes('meta');
    const hasCtrl = parts.includes('ctrl');
    const hasAlt = parts.includes('alt');
    const hasShift = parts.includes('shift');
    
    // Check if modifiers match
    if (hasCmd && !e.metaKey) return false;
    if (hasCtrl && !e.ctrlKey) return false;
    if (hasAlt && !e.altKey) return false;
    if (hasShift && !e.shiftKey) return false;
    
    // Check that no other modifiers are pressed (unless they're part of the shortcut)
    if (!hasCmd && e.metaKey) return false;
    if (!hasCtrl && e.ctrlKey) return false;
    if (!hasAlt && e.altKey) return false;
    if (!hasShift && e.shiftKey) return false;
    
    // Check the key
    const keyPart = parts.find(p => !['cmd', 'meta', 'ctrl', 'alt', 'shift'].includes(p));
    if (keyPart) {
        // Handle special keys
        if (keyPart === 'enter' && key !== 'enter') return false;
        if (keyPart === 'space' && key !== ' ') return false;
        if (keyPart === 'escape' && key !== 'escape') return false;
        // For other keys, check if the key matches (case-insensitive)
        if (keyPart !== 'enter' && keyPart !== 'space' && keyPart !== 'escape') {
            // Normalize key comparison - handle both lowercase and original case
            const normalizedKey = key.toLowerCase();
            const normalizedKeyPart = keyPart.toLowerCase();
            if (normalizedKey !== normalizedKeyPart) return false;
        }
    } else {
        // No key specified in shortcut, so it's invalid
        return false;
    }
    
    return true;
}

/**
 * CaptureModal - Modal UI for capturing ideas
 */
export class CaptureModal extends Modal {
    private inputEl!: HTMLTextAreaElement;
    private errorEl!: HTMLDivElement;
    private classificationEl!: HTMLDivElement;
    private saveButton!: HTMLButtonElement;
    private ideateButton!: HTMLButtonElement;
    private fileManager: FileManager;
    private classificationService: ClassificationService;
    private duplicateDetector: DuplicateDetector;
    // Domain checking removed - functionality hidden
    // private domainService: DomainService;
    private webSearchService: WebSearchService;
    private searchQueryGenerator: SearchQueryGenerator;
    private nameVariantService?: INameVariantService;
    private llmService?: ILLMService;
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
        _domainService: any, // Domain checking removed - functionality hidden (prefix with _ to avoid unused warning)
        webSearchService: WebSearchService,
        nameVariantService?: INameVariantService,
        llmService?: ILLMService,
        onSuccess?: () => void
    ) {
        super(app);
        this.fileManager = fileManager;
        this.classificationService = classificationService;
        this.duplicateDetector = duplicateDetector;
        // Domain checking removed - functionality hidden
        // this.domainService = domainService;
        this.webSearchService = webSearchService;
        this.searchQueryGenerator = new SearchQueryGenerator();
        this.nameVariantService = nameVariantService;
        this.llmService = llmService;
        this.settings = settings;
        this.onSuccess = onSuccess;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-capture-modal');

        // Title with status indicator
        const titleContainer = contentEl.createDiv({ cls: 'ideatr-capture-title-container' });
        titleContainer.createEl('h2', { text: 'Capture idea' });
        
        // Add model status indicator
        const statusIndicator = createModelStatusIndicator(this.llmService, this.settings, this.app);
        titleContainer.appendChild(statusIndicator);

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
            cls: 'ideatr-error ideatr-hidden'
        });

        // Classification results container (hidden initially)
        this.classificationEl = contentEl.createEl('div', {
            cls: 'ideatr-classification ideatr-hidden'
        });

        // Button container
        const buttonContainer = contentEl.createEl('div', {
            cls: 'ideatr-button-container'
        });

        // Help text about accessing other Ideatr features (positioned on the left)
        const helpText = buttonContainer.createEl('div', {
            cls: 'ideatr-help-text'
        });
        const helpParagraph = helpText.createEl('p', {
            attr: {
                style: 'font-size: 0.85em; color: var(--text-muted); margin: 0; display: flex; align-items: center; gap: 0.4em;'
            }
        });
        // Add lightbulb icon (matches the sidebar icon exactly using Obsidian's icon system)
        const lightbulbIcon = createLightbulbIcon();
        lightbulbIcon.addClass('ideatr-icon-muted');
        helpParagraph.appendChild(lightbulbIcon);
        helpParagraph.appendText(' Tip: Access other Ideatr features via Command Palette (search "Ideatr")');

        // Button group (right side)
        const buttonGroup = buttonContainer.createEl('div', {
            cls: 'ideatr-button-group'
        });

        // Show "Classify Now" button if AI is not configured and setup is not completed
        if (!this.settings.setupCompleted && !this.classificationService.isAvailable()) {
            const classifyButton = buttonGroup.createEl('button', {
                text: 'Classify Now',
                cls: 'mod-cta'
            });
            classifyButton.addEventListener('click', () => this.handleClassifyNow());
        }

        // Ideate button (always show, but disabled if LLM is not available)
        const ideateContainer = buttonGroup.createDiv({ cls: 'ideatr-button-with-help' });
        const isLLMAvailable = this.llmService?.isAvailable() ?? false;
        this.ideateButton = ideateContainer.createEl('button', {
            text: 'Ideate',
            cls: 'mod-cta ideatr-ideate-button'
        });
        
        if (!isLLMAvailable) {
            this.ideateButton.disabled = true;
            this.ideateButton.addClass('ideatr-ideate-button-disabled');
            this.ideateButton.setAttribute('title', 'Ideate (AI service not available. Please configure AI in settings.)');
        } else {
            const ideateShortcut = formatShortcut(this.settings.captureIdeateShortcut || 'cmd+enter');
            this.ideateButton.setAttribute('title', `Ideate (${ideateShortcut})`);
            this.ideateButton.addEventListener('click', () => this.handleIdeate());
        }
        
        // Add help icon
        const ideateHelpIcon = createHelpIcon(this.app, 'ideate-button', 'Learn about the Ideate button');
        ideateContainer.appendChild(ideateHelpIcon);

        // Save button
        const saveContainer = buttonGroup.createDiv({ cls: 'ideatr-button-with-help' });
        this.saveButton = saveContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });
        const saveShortcut = formatShortcut(this.settings.captureSaveShortcut || 'alt+enter');
        this.saveButton.setAttribute('title', `Save (${saveShortcut})`);
        this.saveButton.addEventListener('click', () => this.handleSubmit());
        
        // Add help icon
        const saveHelpIcon = createHelpIcon(this.app, 'save-button', 'Learn about the Save button');
        saveContainer.appendChild(saveHelpIcon);

        // Focus input
        this.inputEl.focus();

        // Handle keyboard shortcuts
        this.inputEl.addEventListener('keydown', (e) => {
            // Check Ideate shortcut
            const ideateShortcut = this.settings.captureIdeateShortcut || 'cmd+enter';
            if (matchesShortcut(e, ideateShortcut)) {
                e.preventDefault();
                if (this.llmService?.isAvailable() && this.ideateButton && !this.ideateButton.disabled) {
                    this.handleIdeate();
                }
                return;
            }
            
            // Check Save shortcut
            const saveShortcut = this.settings.captureSaveShortcut || 'alt+enter';
            if (matchesShortcut(e, saveShortcut)) {
                e.preventDefault();
                this.handleSubmit();
                return;
            }
            
            // Reset warning on typing
            if (this.isWarningShown) {
                this.hideError();
                this.isWarningShown = false;
                this.saveButton.setText('Save');
                if (this.ideateButton) {
                    this.ideateButton.textContent = 'Ideate';
                }
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
            this.classificationEl.addClass('ideatr-visible');
            this.classificationEl.removeClass('ideatr-hidden');
            
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
                    this.saveButton.textContent = 'Save Anyway';

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

            // Close modal immediately - don't wait for AI processing
            this.close();
            if (this.onSuccess) {
                this.onSuccess();
            }

            // Process AI tasks in background (non-blocking)
            // This runs after the modal is closed, so the user can continue working
            this.processBackgroundTasks(file, idea.text).catch(error => {
                Logger.warn('Background processing failed:', error);
                // Don't show error to user - it's background processing
            });
        } catch (error) {
            this.showError('Failed to save idea. Please try again.');
            console.error('Error creating idea file:', error);
        }
    }

    async handleIdeate() {
        const text = this.inputEl.value;

        // Validate input
        const validation = validateIdeaText(text);
        if (!validation.valid) {
            this.showError(validation.error || 'Invalid input');
            return;
        }

        // Check if LLM service is available
        if (!this.llmService?.isAvailable()) {
            this.showError('AI service is not available. Please configure AI in settings.');
            return;
        }

        // Check for duplicates if not already warned
        if (!this.isWarningShown) {
            try {
                const duplicateResult = await this.duplicateDetector.checkDuplicate(text);
                if (duplicateResult.isDuplicate) {
                    const count = duplicateResult.duplicates.length;
                    const msg = `Found ${count} similar idea${count > 1 ? 's' : ''}. Press Ideate again to confirm.`;
                    this.showError(msg, true); // Show as warning
                    this.isWarningShown = true;
                    this.duplicatePaths = duplicateResult.duplicates.map(d => d.path);
                    if (this.ideateButton) {
                        this.ideateButton.textContent = 'Ideate Anyway';
                    }
                    return;
                }
            } catch (error) {
                Logger.warn('Duplicate check failed:', error);
                // Proceed if check fails
            }
        }

        let file: TFile | null = null;
        try {
            // Show processing message
            this.showClassificationInProgress(true);
            this.classificationAbortController = new AbortController();

            // Step 1: Create idea file with raw text
            const idea = {
                text: validation.sanitizedText || text,
                timestamp: new Date()
            };

            file = await this.fileManager.createIdeaFile(idea);

            // Step 2: Classify the idea
            const classification = await this.classificationService.classifyIdea(idea.text);
            if (this.classificationAbortController?.signal.aborted) {
                return;
            }

            // Step 3: Generate simple title/subject
            let title = '';
            if (this.llmService.complete) {
                try {
                    const titlePrompt = `Generate a concise, descriptive title for this idea.

Idea: "${idea.text}"

Requirements:
- 2-8 words maximum
- Descriptive and clear (captures the core concept)
- Not overly creative or abstract
- Should help someone quickly understand what this idea is about
- Extract the key concept, not just use the first words

Examples:
- "AI generated puzzle full of interlinked monkeys" → "AI Monkey Puzzle Game"
- "notification app that sends alerts" → "Notification App"
- "task manager for remote teams" → "Team Task Manager"

Title:`;
                    const titleResponse = await this.llmService.complete(titlePrompt, {
                        temperature: 0.3,
                        n_predict: 50,
                        stop: ['\n', '.', '!', '?']
                    });
                    title = titleResponse.trim().replace(/^["']|["']$/g, '').substring(0, 100);
                } catch (error) {
                    Logger.warn('Title generation failed, using fallback:', error);
                    title = extractIdeaNameRuleBased(idea.text);
                }
            } else {
                title = extractIdeaNameRuleBased(idea.text);
            }

            // Step 4: Generate ideas and questions expansion
            let expansionText = '';
            if (this.llmService.expandIdea) {
                try {
                    // Use a simpler expansion focused on ideas and questions
                    const expansionPrompt = `Expand this idea with related concepts, questions, and next steps.

Original Idea:
${idea.text}

Category: ${classification.category || 'general'}
Tags: ${classification.tags.join(', ') || 'none'}

Generate a structured expansion with:

## Related Ideas
2-3 variations or related concepts that explore different angles or implementations. Each should be:
- Distinct from the original but clearly related
- Brief (1-2 sentences each)
- Practical and actionable

## Key Questions
3-4 important questions to explore. Focus on:
- Validation questions (who needs this? what problem does it solve?)
- Implementation questions (how would this work? what's needed?)
- Strategic questions (what are the risks? what's the market?)

## Next Steps
1-2 concrete, actionable next steps to move forward. Be specific and practical.

Format as markdown with the sections above. Keep it concise and actionable - each item should be brief but meaningful.

Response:`;

                    if (this.llmService.complete) {
                        expansionText = await this.llmService.complete(expansionPrompt, {
                            temperature: 0.7,
                            n_predict: 800
                        });
                    }
                } catch (error) {
                    Logger.warn('Expansion generation failed:', error);
                    expansionText = '';
                }
            }

            if (this.classificationAbortController?.signal.aborted) {
                return;
            }

            // Step 5: Update file with title, classification, and expansion
            // First, update frontmatter with classification
            const allRelated = [...new Set([...classification.related, ...this.duplicatePaths])];
            await this.fileManager.updateIdeaFrontmatter(file, {
                category: classification.category,
                tags: classification.tags,
                related: allRelated
            });

            // Then, update the body: add title as heading, keep original text, add expansion
            await this.app.vault.process(file, (content) => {
                // Extract body (everything after frontmatter)
                const frontmatterRegex = /^---\n[\s\S]*?\n---(\n\n?|\n?)/;
                const bodyMatch = content.match(frontmatterRegex);
                const body = bodyMatch ? content.substring(bodyMatch[0].length) : content;

                // Build new body: title heading + original text + expansion
                let newBody = '';
                if (title) {
                    newBody += `# ${title}\n\n`;
                }
                newBody += body.trim();
                if (expansionText) {
                    newBody += '\n\n---\n\n## Ideas & Questions\n\n' + expansionText.trim();
                }

                // Reconstruct full content
                const frontmatter = bodyMatch ? content.substring(0, bodyMatch[0].length) : '';
                return frontmatter + newBody;
            });

            // Step 6: Trigger validation in background (non-blocking)
            this.triggerValidation(file, idea.text, classification.category);

            // Success notification
            new Notice('Idea processed with AI!');

            // Close modal
            this.close();
            if (this.onSuccess) {
                this.onSuccess();
            }
        } catch (error) {
            if (this.classificationAbortController?.signal.aborted) {
                return;
            }
            
            // If the file was created, the idea was saved - show alert to user
            if (file) {
                new Notice('Ideate command failed, but your idea has been saved to your list of ideas.');
            }
            
            this.showError('Failed to process idea. Please try again.');
            console.error('Error processing idea:', error);
            // Show manual mode option
            this.classificationEl.empty();
            this.classificationEl.addClass('ideatr-visible');
            this.classificationEl.removeClass('ideatr-hidden');
            this.classificationEl.createEl('p', {
                text: 'Processing failed. Idea may have been saved without AI processing.',
                cls: 'ideatr-classification-error'
            });
            const continueButton = this.classificationEl.createEl('button', {
                text: 'Continue',
                cls: 'mod-cta'
            });
            continueButton.addEventListener('click', () => {
                this.close();
                if (this.onSuccess) {
                    this.onSuccess();
                }
            });
        }
    }

    showError(message: string, isWarning: boolean = false) {
        this.errorEl.empty(); // Clear any previous content
        this.errorEl.setText(message); // Use Obsidian's setText method
        this.errorEl.addClass('ideatr-visible');
        this.errorEl.removeClass('ideatr-hidden', 'ideatr-invisible');

        if (isWarning) {
            this.errorEl.addClass('ideatr-warning');
            this.errorEl.removeClass('ideatr-error');
        } else {
            this.errorEl.addClass('ideatr-error');
            this.errorEl.removeClass('ideatr-warning');
        }
    }

    hideError() {
        this.errorEl.addClass('ideatr-hidden', 'ideatr-invisible');
        this.errorEl.removeClass('ideatr-visible');
        this.errorEl.removeClass('ideatr-warning');
        this.errorEl.removeClass('ideatr-error');
    }

    showClassificationInProgress(isFirstTime: boolean = false) {
        // Hide input area
        this.inputEl.addClass('ideatr-hidden');
        this.inputEl.removeClass('ideatr-visible');
        const buttonContainer = this.contentEl.querySelector('.ideatr-button-container');
        if (buttonContainer) {
            (buttonContainer as HTMLElement).addClass('ideatr-hidden');
            (buttonContainer as HTMLElement).removeClass('ideatr-visible');
        }

        // Show classification container
        this.classificationEl.empty();
        this.classificationEl.addClass('ideatr-visible');
        this.classificationEl.removeClass('ideatr-hidden');
        
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
        this.classificationEl.addClass('ideatr-visible');
        this.classificationEl.removeClass('ideatr-hidden');
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
        this.classificationEl.addClass('ideatr-visible');
        this.classificationEl.removeClass('ideatr-hidden');
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
     * Process AI tasks in the background after file is saved
     * This includes classification (if autoClassify is enabled) and validation
     */
    private async processBackgroundTasks(file: TFile, ideaText: string): Promise<void> {
        let ideaCategory: IdeaCategory = '';

        // Step 1: Classify if autoClassify is enabled
        if (this.settings.autoClassify && this.classificationService.isAvailable()) {
            try {
                const classification = await this.classificationService.classifyIdea(ideaText);
                ideaCategory = classification.category;
                
                // Update file with classification results (merge with duplicates)
                const allRelated = [...new Set([...classification.related, ...this.duplicatePaths])];
                await this.fileManager.updateIdeaFrontmatter(file, {
                    category: classification.category,
                    tags: classification.tags,
                    related: allRelated
                });
            } catch (error) {
                Logger.warn('Background classification failed:', error);
                // Continue with validation even if classification fails
            }
        }

        // Step 2: Trigger validation in background (non-blocking)
        // This includes web search and name variant generation
        await this.triggerValidation(file, ideaText, ideaCategory);
    }

    /**
     * Trigger validation (web search and name variant generation) in background (non-blocking)
     */
    private async triggerValidation(
        file: TFile,
        ideaText: string,
        category: IdeaCategory
    ): Promise<void> {
        // Extract project name for use in validation services
        const projectName = extractIdeaNameRuleBased(ideaText);

        // Track which validations were attempted
        // Domain checking removed - functionality hidden
        const shouldSearchWeb = this.settings.enableWebSearch && this.settings.autoSearchExistence;
        const shouldGenerateVariants = this.settings.enableNameVariants && 
                                       this.settings.autoGenerateVariants && 
                                       this.nameVariantService?.isAvailable();

        // If no validations are enabled, skip
        if (!shouldSearchWeb && !shouldGenerateVariants) {
            return;
        }

        // Run validation checks in parallel with individual error handling
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
        try {
            const [searchResults, _variantResult] = await Promise.all([searchPromise, variantPromise]);
            const updates: any = {};
            
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
                await this.fileManager.updateIdeaFrontmatter(file, updates);
            }
        } catch (error) {
            // This catch handles unexpected errors in the Promise.all itself
            Logger.warn('Validation orchestration failed:', error);
            // Store error state for validations if they were attempted
            const errorUpdates: any = {};
            if (shouldSearchWeb) {
                errorUpdates['existence-check'] = ['Search error: Validation failed'];
            }
            if (Object.keys(errorUpdates).length > 0) {
                this.fileManager.updateIdeaFrontmatter(file, errorUpdates).catch(err => {
                    Logger.error('Failed to store validation error state:', err);
                });
            }
        }
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
