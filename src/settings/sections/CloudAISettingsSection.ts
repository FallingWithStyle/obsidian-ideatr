import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { ProviderFactory } from '../../services/providers/ProviderFactory';
import type { CloudProviderType } from '../../types/llm-provider';
import { getCloudModelsByProvider, type CloudModelConfig } from '../../utils/ModelValidator';

export class CloudAISettingsSection extends BaseSettingsSection {
    private showComparison: boolean = false;

    display(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Cloud AI' });

        // Add comparison toggle button
        const comparisonContainer = containerEl.createDiv({ cls: 'cloud-model-comparison-container' });
        const comparisonButton = comparisonContainer.createEl('button', {
            text: this.showComparison ? '▼ Hide Model Comparison' : '▶ Show Model Comparison',
            cls: 'mod-link'
        });
        comparisonButton.style.marginBottom = '1em';
        comparisonButton.addEventListener('click', () => {
            this.showComparison = !this.showComparison;
            comparisonButton.textContent = this.showComparison ? '▼ Hide Model Comparison' : '▶ Show Model Comparison';
            const comparisonSection = containerEl.querySelector('.cloud-model-comparison-section') as HTMLElement;
            if (comparisonSection) {
                comparisonSection.style.display = this.showComparison ? 'block' : 'none';
            }
        });

        // Model comparison section (hidden by default)
        const comparisonSection = containerEl.createDiv({ cls: 'cloud-model-comparison-section' });
        comparisonSection.style.display = 'none';
        this.renderModelComparison(comparisonSection);

        new Setting(containerEl)
            .setName('Enable Cloud AI')
            .setDesc('Use cloud AI providers for better quality and faster responses (requires API key)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cloudProvider !== 'none')
                .onChange(async (value) => {
                    if (value) {
                        // Enable Cloud AI by setting a default provider if none is set
                        if (this.plugin.settings.cloudProvider === 'none') {
                            this.plugin.settings.cloudProvider = 'anthropic';
                        }
                        this.plugin.settings.preferCloud = true;
                    } else {
                        // Disable Cloud AI
                        this.plugin.settings.cloudProvider = 'none';
                        this.plugin.settings.preferCloud = false;
                    }
                    await this.saveSettings();
                    this.refresh();
                }));

        // Check if any provider has an API key or if cloud is enabled
        const hasAnyApiKey = (this.plugin.settings.cloudApiKeys && 
            Object.values(this.plugin.settings.cloudApiKeys).some(key => key && key.length > 0)) ||
            (this.plugin.settings.cloudApiKey && this.plugin.settings.cloudApiKey.length > 0);
        if (this.plugin.settings.cloudProvider !== 'none' || hasAnyApiKey) {
            new Setting(containerEl)
                .setName('Cloud Provider')
                .setDesc('Select the cloud AI provider')
                .addDropdown(dropdown => {
                    dropdown
                        .addOption('anthropic', 'Anthropic (Claude 3.5 Haiku)')
                        .addOption('openai', 'OpenAI (GPT-4o Mini)')
                        .addOption('gemini', 'Google Gemini (Gemini 1.5 Flash)')
                        .addOption('groq', 'Groq (Llama 3.3 70B)')
                        .addOption('openrouter', 'OpenRouter (Multiple Models)')
                        .addOption('custom', 'Custom Endpoint (Ollama/LM Studio)')
                        .addOption('none', 'None')
                        .setValue(this.plugin.settings.cloudProvider === 'none' ? 'none' : this.plugin.settings.cloudProvider)
                        .onChange(async (value) => {
                            this.plugin.settings.cloudProvider = value as any;
                            // Don't clear API keys when switching - they're stored per provider
                            await this.saveSettings();
                            this.refresh();
                        });
                });

            if (this.plugin.settings.cloudProvider !== 'none') {
                // API Key field (for most providers)
                if (this.plugin.settings.cloudProvider !== 'custom') {
                    const providerNames: Record<string, string> = {
                        'anthropic': 'Anthropic',
                        'openai': 'OpenAI',
                        'gemini': 'Google Gemini',
                        'groq': 'Groq',
                        'openrouter': 'OpenRouter'
                    };
                    const apiKeyUrls: Record<string, string> = {
                        'anthropic': 'https://console.anthropic.com/',
                        'openai': 'https://platform.openai.com/api-keys',
                        'gemini': 'https://makersuite.google.com/app/apikey',
                        'groq': 'https://console.groq.com/keys',
                        'openrouter': 'https://openrouter.ai/keys'
                    };

                    // Get the API key for the current provider
                    const currentProvider = this.plugin.settings.cloudProvider;
                    let currentApiKey = '';
                    if (this.plugin.settings.cloudApiKeys && 
                        currentProvider in this.plugin.settings.cloudApiKeys) {
                        currentApiKey = this.plugin.settings.cloudApiKeys[currentProvider as keyof typeof this.plugin.settings.cloudApiKeys] || '';
                    }
                    // Fallback to legacy cloudApiKey if new structure doesn't have a key for this provider
                    if (!currentApiKey && this.plugin.settings.cloudApiKey && 
                        this.plugin.settings.cloudProvider === currentProvider) {
                        currentApiKey = this.plugin.settings.cloudApiKey;
                    }

                    new Setting(containerEl)
                        .setName('API Key')
                        .setDesc(`Enter your ${providerNames[this.plugin.settings.cloudProvider] || 'provider'} API key`)
                        .addText(text => {
                            text.setPlaceholder('sk-...')
                                .setValue(currentApiKey);
                            text.inputEl.setAttribute('type', 'password');
                            text.onChange(async (value: string) => {
                                // Ensure cloudApiKeys exists
                                if (!this.plugin.settings.cloudApiKeys) {
                                    this.plugin.settings.cloudApiKeys = {
                                        anthropic: '',
                                        openai: '',
                                        gemini: '',
                                        groq: '',
                                        openrouter: ''
                                    };
                                }
                                // Save to provider-specific key
                                if (currentProvider in this.plugin.settings.cloudApiKeys) {
                                    this.plugin.settings.cloudApiKeys[currentProvider as keyof typeof this.plugin.settings.cloudApiKeys] = value;
                                }
                                await this.saveSettings();
                            });
                        });

                    const helpText = containerEl.createDiv('setting-item-description');
                    helpText.style.marginTop = '5px';
                    const providerName = providerNames[this.plugin.settings.cloudProvider] || 'provider';
                    const apiKeyUrl = apiKeyUrls[this.plugin.settings.cloudProvider] || '#';
                    helpText.innerHTML = `<a href="${apiKeyUrl}" target="_blank">Get your ${providerName} API key</a>`;

                    const costEstimates: Record<string, string> = {
                        'anthropic': '~$0.002 per idea (Claude 3.5 Haiku)',
                        'openai': '~$0.001 per idea (GPT-4o Mini)',
                        'gemini': '~$0.0005 per idea (Gemini 1.5 Flash)',
                        'groq': 'Free (Llama 3.3 70B)',
                        'openrouter': 'Varies by model (see OpenRouter pricing)'
                    };
                    const costEstimate = costEstimates[this.plugin.settings.cloudProvider] || 'Varies';
                    const costText = containerEl.createDiv('setting-item-description');
                    costText.style.marginTop = '5px';
                    costText.style.color = 'var(--text-muted)';
                    costText.textContent = `Cost estimate: ${costEstimate}`;

                    new Setting(containerEl)
                        .setName('Test Connection')
                        .setDesc('Verify your API key is valid')
                        .addButton(button => button
                            .setButtonText('Test Connection')
                            .onClick(async () => {
                                // Get the API key for the current provider
                                const currentProvider = this.plugin.settings.cloudProvider;
                                const apiKey = (this.plugin.settings.cloudApiKeys && 
                                    currentProvider in this.plugin.settings.cloudApiKeys)
                                    ? (this.plugin.settings.cloudApiKeys[currentProvider as keyof typeof this.plugin.settings.cloudApiKeys] || '').trim()
                                    : '';
                                
                                if (!apiKey) {
                                    new Notice('Please enter an API key first');
                                    return;
                                }

                                button.setButtonText('Testing...');
                                button.setDisabled(true);

                                try {
                                    const provider = ProviderFactory.createProvider(
                                        this.plugin.settings.cloudProvider as CloudProviderType,
                                        apiKey,
                                        {
                                            openRouterModel: this.plugin.settings.openRouterModel,
                                            customEndpointUrl: this.plugin.settings.customEndpointUrl
                                        }
                                    );

                                    const authResult = await provider.authenticate(apiKey);
                                    if (!authResult) {
                                        new Notice('Authentication failed: Invalid API key format');
                                        return;
                                    }

                                    const testResult = await provider.classify('Test idea for connection verification');
                                    
                                    if (testResult && (testResult.category || testResult.tags.length > 0)) {
                                        new Notice(`✓ Connection successful! Provider: ${provider.name}`);
                                    } else {
                                        new Notice('Connection test completed, but got unexpected response');
                                    }
                                } catch (error) {
                                    console.error('Connection test failed:', error);
                                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                    new Notice(`Connection failed: ${errorMessage}`);
                                } finally {
                                    button.setButtonText('Test Connection');
                                    button.setDisabled(false);
                                }
                            }));
                }

                // OpenRouter model selection
                if (this.plugin.settings.cloudProvider === 'openrouter') {
                    new Setting(containerEl)
                        .setName('Model')
                        .setDesc('Select the model to use via OpenRouter')
                        .addText(text => text
                            .setPlaceholder('openai/gpt-4o-mini')
                            .setValue(this.plugin.settings.openRouterModel || 'openai/gpt-4o-mini')
                            .onChange(async (value) => {
                                this.plugin.settings.openRouterModel = value;
                                await this.saveSettings();
                            }));
                }

                // Custom endpoint URL
                if (this.plugin.settings.cloudProvider === 'custom') {
                    new Setting(containerEl)
                        .setName('Endpoint URL')
                        .setDesc('Enter your custom endpoint URL (e.g., http://localhost:11434/api/chat for Ollama)')
                        .addText(text => text
                            .setPlaceholder('http://localhost:11434/api/chat')
                            .setValue(this.plugin.settings.customEndpointUrl || '')
                            .onChange(async (value) => {
                                this.plugin.settings.customEndpointUrl = value;
                                await this.saveSettings();
                            }));

                    const customCostText = containerEl.createDiv('setting-item-description');
                    customCostText.style.marginTop = '5px';
                    customCostText.style.color = 'var(--text-muted)';
                    customCostText.textContent = 'Cost estimate: Free (self-hosted)';

                    new Setting(containerEl)
                        .setName('Test Connection')
                        .setDesc('Verify your custom endpoint is accessible')
                        .addButton(button => button
                            .setButtonText('Test Connection')
                            .onClick(async () => {
                                const endpointUrl = this.plugin.settings.customEndpointUrl.trim();
                                if (!endpointUrl) {
                                    new Notice('Please enter an endpoint URL first');
                                    return;
                                }

                                button.setButtonText('Testing...');
                                button.setDisabled(true);

                                try {
                                    const provider = ProviderFactory.createProvider(
                                        'custom' as CloudProviderType,
                                        '',
                                        {
                                            customEndpointUrl: endpointUrl
                                        }
                                    );

                                    const authResult = await provider.authenticate(endpointUrl);
                                    if (!authResult) {
                                        new Notice('Authentication failed: Invalid endpoint URL');
                                        return;
                                    }

                                    const testResult = await provider.classify('Test idea for connection verification');
                                    
                                    if (testResult && (testResult.category || testResult.tags.length > 0)) {
                                        new Notice(`✓ Connection successful! Provider: ${provider.name}`);
                                    } else {
                                        new Notice('Connection test completed, but got unexpected response');
                                    }
                                } catch (error) {
                                    console.error('Connection test failed:', error);
                                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                    new Notice(`Connection failed: ${errorMessage}`);
                                } finally {
                                    button.setButtonText('Test Connection');
                                    button.setDisabled(false);
                                }
                            }));
                }

                new Setting(containerEl)
                    .setName('Prefer Cloud AI')
                    .setDesc('Use cloud AI when available, fallback to local AI on failure')
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.preferCloud)
                        .onChange(async (value) => {
                            this.plugin.settings.preferCloud = value;
                            await this.saveSettings();
                        }));
            }
        }
    }

    private renderModelComparison(containerEl: HTMLElement): void {
        containerEl.empty();
        containerEl.createEl('h4', { text: 'Cloud AI Model Comparison' });
        containerEl.createEl('p', {
            text: 'Compare default cloud AI models to find the best fit for your needs. All models are validated for Ideatr\'s classification and tagging tasks.',
            cls: 'cloud-model-comparison-intro'
        });

        // Group models by provider
        const modelsByProvider: Record<string, CloudModelConfig[]> = {
            'Anthropic': getCloudModelsByProvider('anthropic'),
            'OpenAI': getCloudModelsByProvider('openai'),
            'Google Gemini': getCloudModelsByProvider('gemini'),
            'Groq': getCloudModelsByProvider('groq')
        };

        // Render each provider's models
        for (const [providerName, models] of Object.entries(modelsByProvider)) {
            if (models.length === 0) continue;

            const providerSection = containerEl.createDiv({ cls: 'cloud-model-provider-section' });
            providerSection.createEl('h5', { text: providerName });

            // Create a card for each model
            for (const model of models) {
                const modelCard = providerSection.createDiv({ cls: 'cloud-model-card' });
                modelCard.style.cssText = 'border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 1em; margin-bottom: 1em;';

                // Header with name and badge
                const header = modelCard.createDiv({ cls: 'cloud-model-header' });
                const headerTitle = header.createDiv({ cls: 'cloud-model-header-title' });
                headerTitle.style.cssText = 'display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.5em;';
                headerTitle.createEl('h6', { text: model.name, attr: { style: 'margin: 0;' } });
                const badge = headerTitle.createEl('span', { text: model.badge, cls: 'cloud-model-badge' });
                badge.style.cssText = 'background: var(--text-accent); color: var(--text-on-accent); padding: 0.2em 0.5em; border-radius: 4px; font-size: 0.75em; font-weight: bold;';

                // Description
                modelCard.createEl('p', { text: model.description, cls: 'cloud-model-description' });
                modelCard.querySelector('.cloud-model-description')?.setAttribute('style', 'margin: 0.5em 0; color: var(--text-muted);');

                // Stats
                const stats = modelCard.createDiv({ cls: 'cloud-model-stats' });
                stats.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5em; margin: 0.5em 0;';
                stats.createEl('div', { text: `⭐ Quality: ${model.quality}/5` });
                stats.createEl('div', { text: `⚡ Speed: ${model.speed}/5` });
                stats.createEl('div', { text: `💰 Cost: ${model.costEstimate}` });
                stats.createEl('div', { text: `💵 Tier: ${model.cost.charAt(0).toUpperCase() + model.cost.slice(1)}` });

                // Pros
                const prosContainer = modelCard.createDiv({ cls: 'cloud-model-pros' });
                prosContainer.style.cssText = 'margin-top: 0.5em;';
                prosContainer.createEl('strong', { text: 'Pros: ' });
                const prosList = prosContainer.createEl('ul', { attr: { style: 'margin: 0.25em 0; padding-left: 1.5em;' } });
                model.pros.forEach(pro => prosList.createEl('li', { text: pro }));

                // Cons
                const consContainer = modelCard.createDiv({ cls: 'cloud-model-cons' });
                consContainer.style.cssText = 'margin-top: 0.5em;';
                consContainer.createEl('strong', { text: 'Cons: ' });
                const consList = consContainer.createEl('ul', { attr: { style: 'margin: 0.25em 0; padding-left: 1.5em;' } });
                model.cons.forEach(con => consList.createEl('li', { text: con }));

                // Best for
                const bestFor = modelCard.createDiv({ cls: 'cloud-model-best-for' });
                bestFor.style.cssText = 'margin-top: 0.5em; padding-top: 0.5em; border-top: 1px solid var(--background-modifier-border);';
                bestFor.createEl('strong', { text: 'Best for: ' });
                bestFor.appendText(model.bestFor);
            }
        }
    }
}

