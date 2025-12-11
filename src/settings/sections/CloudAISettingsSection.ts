import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import type { IdeatrSettings } from '../../settings';
import { ProviderFactory } from '../../services/providers/ProviderFactory';
import type { CloudProviderType } from '../../types/llm-provider';
// Model comparison removed in MVP
// import { getCloudModelsByProvider, type CloudModelConfig } from '../../utils/ModelValidator';
// import { cloudModelToDisplayInfo, renderModelGroup } from '../../utils/modelComparisonRenderer';

export class CloudAISettingsSection extends BaseSettingsSection {
    private showComparison: boolean = false;
    private showApiKey: boolean = false;

    display(containerEl: HTMLElement): void {
        // Create header with inline comparison button
        const headerContainer = containerEl.createDiv({ cls: 'cloud-ai-header-container' });
        (headerContainer as HTMLElement).setCssProps({
            'display': 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '1em'
        });
        
        const header = headerContainer.createEl('h3', { text: 'Cloud AI' });
        (header as HTMLElement).setCssProps({
            'margin': '0'
        });

        // Add comparison toggle button as small text to the right
        const comparisonButton = headerContainer.createEl('button', {
            text: this.showComparison ? 'Hide comparison' : 'Show comparison',
            cls: 'mod-link'
        });
        (comparisonButton as HTMLElement).setCssProps({
            'font-size': '0.85em',
            'padding': '0',
            'margin': '0',
            'text-decoration': 'none',
            'background': 'none',
            'border': 'none',
            'cursor': 'pointer',
            'color': 'var(--text-muted)'
        });
        comparisonButton.addEventListener('click', () => {
            this.showComparison = !this.showComparison;
            comparisonButton.textContent = this.showComparison ? 'Hide comparison' : 'Show comparison';
            const comparisonSection = containerEl.querySelector('.cloud-model-comparison-section') as HTMLElement;
            if (comparisonSection) {
                (comparisonSection).setCssProps({
                    'display': this.showComparison ? 'block' : 'none'
                });
            }
        });

        // Model comparison section (hidden by default)
        const comparisonSection = containerEl.createDiv({ cls: 'cloud-model-comparison-section' });
        (comparisonSection as HTMLElement).setCssProps({
            'display': 'none',
            'margin-top': '1em',
            'margin-bottom': '1.5em'
        });
        this.renderModelComparison(comparisonSection);

        new Setting(containerEl)
            .setName('Enable cloud AI')
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
                .setName('Cloud provider')
                .setDesc('Select the cloud AI provider')
                .addDropdown(dropdown => {
                    // Dropdown options start here - brand names preserved below
                    dropdown
                        .addOption('anthropic', 'Anthropic (Claude 3.5 Haiku)')
                        .addOption('openai', 'OpenAI (GPT-4o Mini)')
                        .addOption('gemini', 'Google Gemini (Gemini 1.5 Flash)')
                        .addOption('groq', 'Groq (Llama 3.3 70B)')
                        .addOption('openrouter', 'OpenRouter (multiple models)')
                        .addOption('custom', 'Custom endpoint (Ollama/LM Studio)')
                        .addOption('none', 'None')
                        .setValue(this.plugin.settings.cloudProvider === 'none' ? 'none' : this.plugin.settings.cloudProvider)
                        .onChange(async (value) => {
                            // Type-safe assignment - value is guaranteed to be one of the valid options
                            this.plugin.settings.cloudProvider = value as IdeatrSettings['cloudProvider'];
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

                    const apiKeySetting = new Setting(containerEl)
                        .setName('API key')
                        .setDesc(`Enter your ${providerNames[this.plugin.settings.cloudProvider] || 'provider'} API key`);
                    
                    let apiKeyInput: HTMLInputElement;
                    apiKeySetting.addText(text => {
                        text.setPlaceholder('sk-...')
                            .setValue(currentApiKey);
                        apiKeyInput = text.inputEl;
                        text.inputEl.setAttribute('type', this.showApiKey ? 'text' : 'password');
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
                    
                    apiKeySetting.addButton(button => button
                        .setButtonText(this.showApiKey ? 'Hide' : 'Show')
                        .onClick(() => {
                            this.showApiKey = !this.showApiKey;
                            if (apiKeyInput) {
                                apiKeyInput.setAttribute('type', this.showApiKey ? 'text' : 'password');
                            }
                            button.setButtonText(this.showApiKey ? 'Hide' : 'Show');
                        }));

                    const helpText = containerEl.createDiv('setting-item-description');
                    (helpText as HTMLElement).setCssProps({
                        'margin-top': '5px'
                    });
                    const providerName = providerNames[this.plugin.settings.cloudProvider] || 'provider';
                    const apiKeyUrl = apiKeyUrls[this.plugin.settings.cloudProvider] || '#';
                    helpText.createEl('a', {
                        href: apiKeyUrl,
                        text: `Get your ${providerName} API key`,
                        attr: { target: '_blank' }
                    });

                    const costEstimates: Record<string, string> = {
                        'anthropic': '~$0.002 per idea (Claude 3.5 Haiku)',
                        'openai': '~$0.001 per idea (GPT-4o Mini)',
                        'gemini': '~$0.0005 per idea (Gemini 1.5 Flash)',
                        'groq': 'Free (Llama 3.3 70B)',
                        'openrouter': 'Varies by model (see OpenRouter pricing)'
                    };
                    const costEstimate = costEstimates[this.plugin.settings.cloudProvider] || 'Varies';
                    const costText = containerEl.createDiv('setting-item-description');
                    (costText as HTMLElement).setCssProps({
                        'margin-top': '5px',
                        'color': 'var(--text-muted)'
                    });
                    costText.textContent = `Cost estimate: ${costEstimate}`;

                    new Setting(containerEl)
                        .setName('Test connection')
                        .setDesc('Verify your API key is valid')
                        .addButton(button => button
                            .setButtonText('Test connection')
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
                                        new Notice('Authentication failed: invalid API key format');
                                        return;
                                    }

                                    const testResult = await provider.classify('test idea for connection verification');
                                    
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
                                    button.setButtonText('Test connection');
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
                    (customCostText as HTMLElement).setCssProps({
                        'margin-top': '5px',
                        'color': 'var(--text-muted)'
                    });
                    customCostText.textContent = 'Cost estimate: free (self-hosted)';

                    new Setting(containerEl)
                        .setName('Test connection')
                        .setDesc('Verify your custom endpoint is accessible')
                        .addButton(button => button
                            .setButtonText('Test connection')
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
                                        new Notice('Authentication failed: invalid endpoint URL');
                                        return;
                                    }

                                    const testResult = await provider.classify('test idea for connection verification');
                                    
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
                                    button.setButtonText('Test connection');
                                    button.setDisabled(false);
                                }
                            }));
                }

                // Removed "Prefer cloud AI" toggle - MVP uses cloud AI only
            }
        }
    }

    private renderModelComparison(containerEl: HTMLElement): void {
        containerEl.empty();
        
        const introEl = containerEl.createEl('p', {
            text: 'Compare cloud AI models to find the best fit for your needs. All models are validated for Ideatr\'s classification and tagging tasks.',
            cls: 'cloud-model-comparison-intro'
        });
        introEl.setCssProps({
            'margin-bottom': '1.5em',
            'color': 'var(--text-muted)',
            'font-size': '0.9em'
        });

        // Create comparison table
        const table = containerEl.createEl('table', { cls: 'model-comparison-table' });
        (table as HTMLElement).setCssProps({
            'width': '100%',
            'border-collapse': 'collapse',
            'margin-bottom': '1em'
        });

        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        (headerRow as HTMLElement).setCssProps({
            'border-bottom': '2px solid var(--background-modifier-border)'
        });
        
        const providerHeader = headerRow.createEl('th', { text: 'Provider' });
        (providerHeader as HTMLElement).setCssProps({
            'text-align': 'left',
            'padding': '0.75em',
            'font-weight': '600'
        });
        
        const prosHeader = headerRow.createEl('th', { text: 'Pros' });
        (prosHeader as HTMLElement).setCssProps({
            'text-align': 'left',
            'padding': '0.75em',
            'font-weight': '600',
            'width': '40%'
        });
        
        const consHeader = headerRow.createEl('th', { text: 'Cons' });
        (consHeader as HTMLElement).setCssProps({
            'text-align': 'left',
            'padding': '0.75em',
            'font-weight': '600',
            'width': '40%'
        });

        // Table body
        const tbody = table.createEl('tbody');
        
        // Model comparison data
        const models = [
            {
                provider: 'Anthropic\n(Claude 3.5 Haiku)',
                cost: '~$0.002/idea',
                pros: [
                    'Excellent quality and accuracy',
                    'Great at structured tasks',
                    'Reliable and consistent',
                    'Strong reasoning capabilities'
                ],
                cons: [
                    'Higher cost than some alternatives',
                    'Requires API key setup'
                ]
            },
            {
                provider: 'OpenAI\n(GPT-4o Mini)',
                cost: '~$0.001/idea',
                pros: [
                    'Very affordable',
                    'Fast response times',
                    'Good quality for price',
                    'Widely available'
                ],
                cons: [
                    'Slightly lower quality than premium models',
                    'Requires API key setup'
                ]
            },
            {
                provider: 'Google Gemini\n(Gemini 1.5 Flash)',
                cost: '~$0.0005/idea',
                pros: [
                    'Most affordable option',
                    'Very fast responses',
                    'Good for simple tasks',
                    'Generous free tier'
                ],
                cons: [
                    'Quality may vary for complex ideas',
                    'Requires API key setup'
                ]
            },
            {
                provider: 'Groq\n(Llama 3.3 70B)',
                cost: 'Free',
                pros: [
                    'Completely free',
                    'Extremely fast inference',
                    'No API costs',
                    'Good quality for free tier'
                ],
                cons: [
                    'May have rate limits',
                    'Requires API key (free)',
                    'Quality not as high as paid options'
                ]
            },
            {
                provider: 'OpenRouter\n(100+ models)',
                cost: 'Varies by model',
                pros: [
                    'Access to 100+ models',
                    'Flexible pricing options',
                    'Can choose best model per task',
                    'Unified API interface'
                ],
                cons: [
                    'Pricing varies significantly',
                    'Requires model selection',
                    'More complex setup'
                ]
            },
            {
                provider: 'Custom Endpoint\n(Ollama/LM Studio)',
                cost: 'Free (self-hosted)',
                pros: [
                    'Completely free',
                    'Full privacy control',
                    'No API costs',
                    'Works offline'
                ],
                cons: [
                    'Requires local setup',
                    'Needs sufficient hardware',
                    'May be slower than cloud',
                    'More technical setup'
                ]
            }
        ];

        // Add rows for each model
        models.forEach((model, index) => {
            const row = tbody.createEl('tr');
            (row as HTMLElement).setCssProps({
                'border-bottom': '1px solid var(--background-modifier-border)'
            });
            
            if (index % 2 === 0) {
                (row as HTMLElement).setCssProps({
                    'background-color': 'var(--background-secondary)'
                });
            }

            // Provider column
            const providerCell = row.createEl('td');
            (providerCell as HTMLElement).setCssProps({
                'padding': '0.75em',
                'vertical-align': 'top',
                'font-weight': '500'
            });
            const providerParts = model.provider.split('\n');
            providerCell.createEl('div', { text: providerParts[0] });
            if (providerParts.length > 1) {
                const subtitle = providerCell.createEl('div', { text: providerParts[1] });
                (subtitle as HTMLElement).setCssProps({
                    'font-size': '0.85em',
                    'color': 'var(--text-muted)',
                    'margin-top': '0.25em'
                });
            }
            const costDiv = providerCell.createEl('div', { 
                text: model.cost,
                cls: 'model-cost'
            });
            (costDiv as HTMLElement).setCssProps({
                'font-size': '0.85em',
                'color': 'var(--text-muted)',
                'margin-top': '0.25em'
            });

            // Pros column
            const prosCell = row.createEl('td');
            (prosCell as HTMLElement).setCssProps({
                'padding': '0.75em',
                'vertical-align': 'top'
            });
            const prosList = prosCell.createEl('ul', { cls: 'model-pros-list' });
            (prosList as HTMLElement).setCssProps({
                'margin': '0',
                'padding-left': '1.5em',
                'list-style-type': 'none'
            });
            model.pros.forEach(pro => {
                const li = prosList.createEl('li');
                (li as HTMLElement).setCssProps({
                    'margin-bottom': '0.4em',
                    'position': 'relative',
                    'padding-left': '1.2em'
                });
                // Add checkmark
                const checkmark = li.createSpan({ text: '✓ ', cls: 'pro-checkmark' });
                (checkmark as HTMLElement).setCssProps({
                    'color': 'var(--text-success)',
                    'margin-right': '0.3em',
                    'font-weight': 'bold'
                });
                // Add the text after the checkmark
                li.createSpan({ text: pro });
            });

            // Cons column
            const consCell = row.createEl('td');
            (consCell as HTMLElement).setCssProps({
                'padding': '0.75em',
                'vertical-align': 'top'
            });
            const consList = consCell.createEl('ul', { cls: 'model-cons-list' });
            (consList as HTMLElement).setCssProps({
                'margin': '0',
                'padding-left': '1.5em',
                'list-style-type': 'none'
            });
            model.cons.forEach(con => {
                const li = consList.createEl('li');
                (li as HTMLElement).setCssProps({
                    'margin-bottom': '0.4em',
                    'position': 'relative',
                    'padding-left': '1.2em',
                    'color': 'var(--text-muted)'
                });
                const warning = li.createSpan({ text: '⚠ ', cls: 'con-warning' });
                (warning as HTMLElement).setCssProps({
                    'color': 'var(--text-warning)',
                    'margin-right': '0.3em'
                });
                // Add the text after the warning
                li.createSpan({ text: con });
            });
        });

        // Add footer note
        const footerNote = containerEl.createEl('p', {
            text: 'All models are validated for Ideatr\'s classification and tagging tasks. Choose based on your priorities: cost, quality, speed, or privacy.',
            cls: 'setting-item-description'
        });
        (footerNote as HTMLElement).setCssProps({
            'margin-top': '1em',
            'font-size': '0.9em',
            'color': 'var(--text-muted)',
            'font-style': 'italic'
        });
    }
}

