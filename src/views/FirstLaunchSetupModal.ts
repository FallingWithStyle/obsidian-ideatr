import { Modal, App, Notice, Setting } from 'obsidian';
import type { IModelManager } from '../services/ModelManager';
import { ModelManager } from '../services/ModelManager';
import type { IdeatrSettings } from '../settings';
import { ModelDownloadModal } from './ModelDownloadModal';
import { checkModelCompatibility, getSystemInfoString } from '../utils/systemCapabilities';
import { localModelToDisplayInfo, renderCompactModelCard } from '../utils/modelComparisonRenderer';
import { showConfirmation } from '../utils/confirmation';
import { createCheckIcon, createInfoIcon } from '../utils/svgIcons';

/**
 * FirstLaunchSetupModal - Modal for first-launch AI setup
 */
export class FirstLaunchSetupModal extends Modal {
    private settings: IdeatrSettings;
    private onComplete: () => void;

    constructor(
        app: App,
        _modelManager: IModelManager,
        settings: IdeatrSettings,
        onComplete: () => void
    ) {
        super(app);
        this.settings = settings;
        this.onComplete = onComplete;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-setup-modal');

        // Title
        contentEl.createEl('h2', { text: 'Manage AI Models' });
        contentEl.createEl('p', {
            text: 'Choose how you want to use AI for idea enhancement:',
            cls: 'ideatr-setup-description'
        });

        // Option 1: Download AI Model
        const downloadOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        downloadOption.createEl('h3', { text: 'Download AI Model' });
        // Use smallest model as default for display
        const defaultModelManager = new ModelManager('phi-3.5-mini');
        const modelConfig = defaultModelManager.getModelConfig();
        const modelSizeGB = (modelConfig.sizeMB / 1024).toFixed(1);
        downloadOption.createEl('p', {
            text: `Download a local AI model (${modelSizeGB} GB for default model) for offline, free AI idea enhancement including classification, expansion, and more. Choose from multiple models optimized for different needs.`
        });
        const featuresList = downloadOption.createEl('ul', {
            cls: 'ideatr-setup-features'
        });
        featuresList.createEl('li', { text: '✅ Works offline' });
        featuresList.createEl('li', { text: '✅ Free to use' });
        featuresList.createEl('li', { text: '✅ No API keys needed' });
        featuresList.createEl('li', { text: `⚠️ Requires ${modelSizeGB} GB download (varies by model)` });
        const downloadButton = downloadOption.createEl('button', {
            text: 'Choose & Download Model',
            cls: 'mod-cta'
        });
        downloadButton.addEventListener('click', () => this.handleDownloadOption());

        // Option 2: Use API Key
        const apiKeyOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        apiKeyOption.createEl('h3', { text: 'Use My API Key' });
        apiKeyOption.createEl('p', {
            text: 'Use a cloud AI provider (Anthropic, OpenAI, etc.) for better quality and faster responses.'
        });
        const apiFeaturesList = apiKeyOption.createEl('ul', {
            cls: 'ideatr-setup-features'
        });
        apiFeaturesList.createEl('li', { text: '✅ Better quality results' });
        apiFeaturesList.createEl('li', { text: '✅ Faster responses' });
        apiFeaturesList.createEl('li', { text: '✅ No local storage needed' });
        apiFeaturesList.createEl('li', { text: '⚠️ Requires API key (paid)' });
        const apiKeyButton = apiKeyOption.createEl('button', {
            text: 'Enter API Key',
            cls: 'mod-cta'
        });
        apiKeyButton.addEventListener('click', () => this.handleApiKeyOption());

        // Option 3: Skip
        const skipOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        skipOption.createEl('h3', { text: 'Skip for Now' });
        skipOption.createEl('p', {
            text: 'Continue without AI. You can set up AI later in settings.'
        });
        const skipButton = skipOption.createEl('button', {
            text: 'Skip Setup',
            cls: 'mod-cancel'
        });
        skipButton.addEventListener('click', () => this.handleSkipOption());
    }

    private async handleDownloadOption(): Promise<void> {
        this.contentEl.empty();
        this.contentEl.createEl('h2', { text: 'Choose AI Model' });
        this.contentEl.createEl('p', {
            text: 'Select which model to download. You can change this later in settings.',
            cls: 'model-selection-intro'
        });

        // Get all models from ModelManager
        const modelManager = new ModelManager();
        const availableModels = modelManager.getAvailableModels();

        // Create a card for each model using standardized format
        for (const modelKey of Object.keys(availableModels) as Array<keyof typeof availableModels>) {
            const config = availableModels[modelKey];
            const container = this.contentEl.createDiv({ cls: 'model-option-card' });

            // Render compact model card
            const modelDisplay = localModelToDisplayInfo(config);
            renderCompactModelCard(container, modelDisplay, true);

            // Select button with checksum indicator (add to container, below card)
            const selectButtonSetting = new Setting(container);
            
            selectButtonSetting
                .addButton(btn => {
                    btn
                        .setButtonText(`Select ${config.name}`)
                        .setCta()
                        .onClick(async () => {
                        const modelKeyTyped = modelKey as 'phi-3.5-mini' | 'qwen-2.5-7b' | 'llama-3.1-8b' | 'llama-3.3-70b';
                        
                        // Check system compatibility
                        const compatibility = checkModelCompatibility(modelKey);
                        
                        if (!compatibility.isCompatible) {
                            // Show warning and ask for confirmation
                            const systemInfo = getSystemInfoString();
                            const message = `${compatibility.warning}\n\n${compatibility.recommendation || ''}\n\n${systemInfo}\n\nDo you want to proceed anyway?`;
                            
                            const proceed = await showConfirmation(this.app, message);
                            if (!proceed) {
                                return; // User cancelled
                            }
                        } else if (compatibility.warning) {
                            // Show warning but allow proceeding
                            const systemInfo = getSystemInfoString();
                            const proceed = await showConfirmation(this.app, `${compatibility.warning}\n\n${compatibility.recommendation || ''}\n\n${systemInfo}\n\nDo you want to proceed?`);
                            if (!proceed) {
                                return; // User cancelled
                            }
                        }
                        
                        this.settings.localModel = modelKeyTyped;
                        await this.startDownload(modelKey);
                    });
                    
                    // Add status indicator to the left of button
                    // Insert it before the button in the controlEl
                    const controlEl = selectButtonSetting.controlEl;
                    if (controlEl) {
                        // Create indicator and insert it at the beginning
                        const statusIndicator = document.createElement('div');
                        statusIndicator.className = 'model-status-indicator';
                        const checkingText = document.createElement('span');
                        checkingText.className = 'model-status-text';
                        checkingText.textContent = 'Checking...';
                        statusIndicator.appendChild(checkingText);
                        
                        // Insert at the beginning of controlEl (before the button)
                        controlEl.insertBefore(statusIndicator, controlEl.firstChild);
                        
                        // Check download status and verify integrity
                        (async () => {
                            try {
                                const modelManager = new ModelManager(modelKey);
                                const isDownloaded = await modelManager.isModelDownloaded();
                                
                                if (isDownloaded) {
                                    // Verify integrity
                                    const isValid = await modelManager.verifyModelIntegrity();
                                    statusIndicator.empty();
                                    const statusIcon = document.createElement('span');
                                    statusIcon.className = `model-status-icon ${isValid ? 'model-status-valid' : 'model-status-invalid'}`;
                                    statusIcon.title = isValid ? 'File verified' : 'File verification failed';
                                    const iconSvg = isValid ? createCheckIcon(16) : createInfoIcon(16);
                                    statusIcon.appendChild(iconSvg);
                                    statusIndicator.appendChild(statusIcon);
                                } else {
                                    statusIndicator.empty();
                                }
                            } catch (error) {
                                // If verification fails due to error, show error icon
                                console.error('Error verifying model integrity:', error);
                                statusIndicator.empty();
                                const statusIcon = document.createElement('span');
                                statusIcon.className = 'model-status-icon model-status-invalid';
                                statusIcon.title = 'Verification error';
                                const iconSvg = createInfoIcon(16);
                                statusIcon.appendChild(iconSvg);
                                statusIndicator.appendChild(statusIcon);
                            }
                        })();
                    }
                });
        }
    }

    private async startDownload(modelKey: string): Promise<void> {
        const modelManager = new ModelManager(modelKey);
        const modal = new ModelDownloadModal(
            this.app,
            modelManager
        );

        // Override close to mark setup as complete
        const originalClose = modal.close.bind(modal);
        modal.close = () => {
            originalClose();
            // Check if download was successful
            void modelManager.isModelDownloaded().then(downloaded => {
                if (downloaded) {
                    this.settings.setupCompleted = true;
                    this.settings.modelDownloaded = true;
                    this.settings.llmProvider = 'llama';
                    this.settings.modelPath = modelManager.getModelPath();
                    this.onComplete();
                    this.close();
                }
            });
        };

        modal.open();
    }

    private handleApiKeyOption(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-setup-modal');

        // Title
        contentEl.createEl('h2', { text: 'Enter API Key' });
        contentEl.createEl('p', {
            text: 'Enter your API key for a cloud AI provider. You can configure this later in settings.',
            cls: 'ideatr-setup-description'
        });

        // Provider selection
        const providerContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        providerContainer.createEl('label', { text: 'Provider:', attr: { for: 'ideatr-provider-select' } });
        const providerSelect = providerContainer.createEl('select', {
            attr: { id: 'ideatr-provider-select' }
        });
        providerSelect.createEl('option', { text: 'Anthropic (Claude)', attr: { value: 'anthropic' } });
        providerSelect.createEl('option', { text: 'OpenAI (GPT)', attr: { value: 'openai' } });
        providerSelect.createEl('option', { text: 'Skip for now', attr: { value: 'none' } });

        // API key input
        const keyContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        keyContainer.createEl('label', { text: 'API Key:', attr: { for: 'ideatr-api-key-input' } });
        const apiKeyInput = keyContainer.createEl('input', {
            attr: {
                id: 'ideatr-api-key-input',
                type: 'password',
                placeholder: 'Enter your API key'
            }
        });

        // Help text
        contentEl.createEl('p', {
            text: 'Note: API keys are stored in plain text in Obsidian settings. Keep your vault secure.',
            cls: 'ideatr-help-text'
        });

        // Buttons
        const buttonContainer = contentEl.createEl('div', { cls: 'ideatr-button-container' });
        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });
        saveButton.addEventListener('click', () => {
            const provider = providerSelect.value;
            const apiKey = apiKeyInput.value;

            if (provider === 'none') {
                this.handleSkipOption();
                return;
            }

            if (!apiKey.trim()) {
                new Notice('Please enter an API key');
                return;
            }

            this.handleApiKeySubmit(apiKey, provider as 'anthropic' | 'openai');
        });

        const backButton = buttonContainer.createEl('button', {
            text: 'Back'
        });
        backButton.addEventListener('click', () => {
            this.onOpen(); // Return to main options
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.handleSkipOption();
        });
    }

    private handleApiKeySubmit(apiKey: string, provider: 'anthropic' | 'openai'): void {
        // Ensure cloudApiKeys exists
        if (!this.settings.cloudApiKeys) {
            this.settings.cloudApiKeys = {
                anthropic: '',
                openai: '',
                gemini: '',
                groq: '',
                openrouter: ''
            };
        }
        
        // Store API key for the specific provider
        this.settings.cloudApiKeys[provider] = apiKey;
        this.settings.cloudProvider = provider;
        this.settings.preferCloud = true;
        this.settings.llmProvider = provider;
        this.settings.setupCompleted = true;

        // TODO: Test API key connection
        // For now, just mark as complete
        new Notice('API key saved. Cloud AI setup complete!');
        this.onComplete();
        this.close();
    }

    private handleSkipOption(): void {
        this.settings.setupCompleted = true;
        this.settings.llmProvider = 'none';
        this.onComplete();
        this.close();
        new Notice('Setup skipped. You can configure AI later in settings.');
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Check if this is the first launch
 */
export function isFirstLaunch(settings: IdeatrSettings): boolean {
    const hasAnyApiKey = settings.cloudApiKeys && 
        Object.values(settings.cloudApiKeys).some(key => key && key.length > 0);
    const hasLegacyApiKey = settings.cloudApiKey && settings.cloudApiKey.length > 0;
    
    return !settings.setupCompleted &&
        !settings.modelDownloaded &&
        !hasAnyApiKey &&
        !hasLegacyApiKey;
}

