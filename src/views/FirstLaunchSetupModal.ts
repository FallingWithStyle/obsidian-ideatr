import { Modal, App, Notice } from 'obsidian';
import type { IdeatrSettings } from '../settings';

/**
 * FirstLaunchSetupModal - Modal for first-launch AI setup
 */
export class FirstLaunchSetupModal extends Modal {
    private settings: IdeatrSettings;
    private onComplete: () => void;

    constructor(
        app: App,
        _modelManager: null,
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
        contentEl.createEl('h2', { text: 'Manage AI models' });

        contentEl.createEl('p', {
            text: 'Choose how you want to use AI for idea enhancement:',
            cls: 'ideatr-setup-description'
        });

        // Option 1: Use API Key
        const apiKeyOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        apiKeyOption.createEl('h3', { text: 'Use my API key' });
        apiKeyOption.createEl('p', {
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            text: 'Use a cloud AI provider (Anthropic, OpenAI, etc.) for better quality and faster responses.'
        });
        const apiFeaturesList = apiKeyOption.createEl('ul', {
            cls: 'ideatr-setup-features'
        });
        apiFeaturesList.createEl('li', { text: '✅ better quality results' });
        apiFeaturesList.createEl('li', { text: '✅ faster responses' });
        apiFeaturesList.createEl('li', { text: '✅ no local storage needed' });
        apiFeaturesList.createEl('li', { text: '⚠️ requires API key (paid)' });
        const apiKeyButton = apiKeyOption.createEl('button', {
            text: 'Enter API key',
            cls: 'mod-cta'
        });
        apiKeyButton.addEventListener('click', () => void this.handleApiKeyOption());

        // Option 2: Skip
        const skipOption = contentEl.createEl('div', { cls: 'ideatr-setup-option' });
        skipOption.createEl('h3', { text: 'Skip for now' });
        skipOption.createEl('p', {
            text: 'Continue without AI. You can set up AI later in settings.'
        });
        const skipButton = skipOption.createEl('button', {
            text: 'Skip setup',
            cls: 'mod-cancel'
        });
        skipButton.addEventListener('click', () => void this.handleSkipOption());
    }

    private handleApiKeyOption(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-setup-modal');

        // Title
        contentEl.createEl('h2', { text: 'Enter API key' });
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
        // eslint-disable-next-line obsidianmd/ui/sentence-case
        providerSelect.createEl('option', { text: 'Anthropic (Claude)', attr: { value: 'anthropic' } });
        // eslint-disable-next-line obsidianmd/ui/sentence-case
        providerSelect.createEl('option', { text: 'OpenAI (GPT)', attr: { value: 'openai' } });
        providerSelect.createEl('option', { text: 'Skip for now', attr: { value: 'none' } });

        // API key input
        const keyContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        keyContainer.createEl('label', { text: 'API key:', attr: { for: 'ideatr-api-key-input' } });
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
        !hasAnyApiKey &&
        !hasLegacyApiKey;
}

