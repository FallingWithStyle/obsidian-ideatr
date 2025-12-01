import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { ProviderFactory } from '../../services/providers/ProviderFactory';
import type { CloudProviderType } from '../../types/llm-provider';

export class CloudAISettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Cloud AI' });

        new Setting(containerEl)
            .setName('Enable Cloud AI')
            .setDesc('Use cloud AI providers for better quality and faster responses (requires API key)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cloudProvider !== 'none' && this.plugin.settings.cloudApiKey.length > 0)
                .onChange(async (value) => {
                    if (value) {
                        this.plugin.settings.preferCloud = true;
                    } else {
                        this.plugin.settings.cloudProvider = 'none';
                        this.plugin.settings.cloudApiKey = '';
                        this.plugin.settings.preferCloud = false;
                    }
                    await this.saveSettings();
                    this.refresh();
                }));

        if (this.plugin.settings.cloudProvider !== 'none' || this.plugin.settings.cloudApiKey.length > 0) {
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
                            if (value === 'none') {
                                this.plugin.settings.cloudApiKey = '';
                            }
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

                    new Setting(containerEl)
                        .setName('API Key')
                        .setDesc(`Enter your ${providerNames[this.plugin.settings.cloudProvider] || 'provider'} API key`)
                        .addText(text => {
                            text.setPlaceholder('sk-...')
                                .setValue(this.plugin.settings.cloudApiKey);
                            text.inputEl.setAttribute('type', 'password');
                            text.onChange(async (value: string) => {
                                this.plugin.settings.cloudApiKey = value;
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
                                const apiKey = this.plugin.settings.cloudApiKey.trim();
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
}

