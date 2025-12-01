import { Modal, App, Notice } from 'obsidian';
import type { IModelManager } from '../services/ModelManager';
import type { IdeatrSettings } from '../settings';
import { ModelDownloadModal } from './ModelDownloadModal';

/**
 * FirstLaunchSetupModal - Modal for first-launch AI setup
 */
export class FirstLaunchSetupModal extends Modal {
    private modelManager: IModelManager;
    private settings: IdeatrSettings;
    private onComplete: () => void;

    constructor(
        app: App,
        modelManager: IModelManager,
        settings: IdeatrSettings,
        onComplete: () => void
    ) {
        super(app);
        this.modelManager = modelManager;
        this.settings = settings;
        this.onComplete = onComplete;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-setup-modal');

        // Title
        contentEl.createEl('h2', { text: 'Welcome to Ideatr AI' });
        contentEl.createEl('p', {
            text: 'Choose how you want to use AI for idea classification:',
            cls: 'ideatr-setup-description'
        });

        // Option 1: Download AI Model
        const downloadOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        downloadOption.createEl('h3', { text: 'Download AI Model' });
        const modelInfo = this.modelManager.getModelInfo();
        downloadOption.createEl('p', {
            text: `Download Llama 3.2 3B model (${(modelInfo.sizeMB / 1024).toFixed(2)} GB) for offline, free AI classification.`
        });
        downloadOption.createEl('ul', {
            cls: 'ideatr-setup-features'
        }).innerHTML = `
            <li>✅ Works offline</li>
            <li>✅ Free to use</li>
            <li>✅ No API keys needed</li>
            <li>⚠️ Requires ~2.3 GB download</li>
        `;
        const downloadButton = downloadOption.createEl('button', {
            text: 'Download Model',
            cls: 'mod-cta'
        });
        downloadButton.addEventListener('click', () => this.handleDownloadOption());

        // Option 2: Use API Key
        const apiKeyOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        apiKeyOption.createEl('h3', { text: 'Use My API Key' });
        apiKeyOption.createEl('p', {
            text: 'Use a cloud AI provider (Anthropic, OpenAI, etc.) for better quality and faster responses.'
        });
        apiKeyOption.createEl('ul', {
            cls: 'ideatr-setup-features'
        }).innerHTML = `
            <li>✅ Better quality results</li>
            <li>✅ Faster responses</li>
            <li>✅ No local storage needed</li>
            <li>⚠️ Requires API key (paid)</li>
        `;
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
        // Check if model is already downloaded
        const isDownloaded = await this.modelManager.isModelDownloaded();
        
        if (isDownloaded) {
            // Model already exists, just mark setup as complete
            this.settings.setupCompleted = true;
            this.settings.modelDownloaded = true;
            this.settings.llmProvider = 'llama';
            this.onComplete();
            this.close();
            new Notice('Model already downloaded. Setup complete!');
            return;
        }

        // Open download modal
        const downloadModal = new ModelDownloadModal(this.app, this.modelManager);
        
        // Override close to mark setup as complete
        const originalClose = downloadModal.close.bind(downloadModal);
        downloadModal.close = () => {
            originalClose();
            // Check if download was successful
            this.modelManager.isModelDownloaded().then(downloaded => {
                if (downloaded) {
                    this.settings.setupCompleted = true;
                    this.settings.modelDownloaded = true;
                    this.settings.llmProvider = 'llama';
                    this.settings.modelPath = this.modelManager.getModelPath();
                    this.onComplete();
                    this.close();
                }
            });
        };

        downloadModal.open();
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

    private async handleApiKeySubmit(apiKey: string, provider: 'anthropic' | 'openai'): Promise<void> {
        // Store API key and provider
        this.settings.cloudApiKey = apiKey;
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
    return !settings.setupCompleted && 
           !settings.modelDownloaded && 
           !settings.cloudApiKey;
}

