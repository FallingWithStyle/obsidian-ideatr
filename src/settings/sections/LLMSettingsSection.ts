import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { FirstLaunchSetupModal } from '../../views/FirstLaunchSetupModal';
import { ModelManager, MODELS } from '../../services/ModelManager';
import { createHelpIcon } from '../../utils/HelpIcon';
import { checkModelCompatibility, getSystemInfoString } from '../../utils/systemCapabilities';
import { showConfirmation } from '../../utils/confirmation';
import { createCheckIcon, createInfoIcon } from '../../utils/svgIcons';
import type { IdeatrSettings } from '../../settings';

export class LLMSettingsSection extends BaseSettingsSection {
    /**
     * Get list of downloaded model keys
     */
    private async getDownloadedModels(): Promise<string[]> {
        const downloadedModels: string[] = [];
        
        for (const modelKey of Object.keys(MODELS)) {
            const modelManager = new ModelManager(modelKey);
            const isDownloaded = await modelManager.isModelDownloaded();
            if (isDownloaded) {
                downloadedModels.push(modelKey);
            }
        }
        
        return downloadedModels;
    }

    display(containerEl: HTMLElement): void {
        const titleContainer = containerEl.createDiv({ cls: 'settings-section-title' });
        titleContainer.createEl('h2', { text: 'AI Configuration' });
        const helpIcon = createHelpIcon(this.app, 'getting-started', 'Learn about AI Configuration');
        titleContainer.appendChild(helpIcon);

        // Local AI Version Warning Banner
        const warningBanner = containerEl.createDiv({ cls: 'ideatr-local-ai-warning' });
        (warningBanner as HTMLElement).setCssProps({
            'background': 'var(--background-modifier-border)',
            'padding': '1em',
            'border-radius': '4px',
            'margin-bottom': '1.5em',
            'border-left': '3px solid var(--text-warning)'
        });
        
        warningBanner.createEl('strong', { 
            text: '⚠️ Local AI Version - No Updates',
            attr: { style: 'display: block; margin-bottom: 0.5em; color: var(--text-warning);' }
        });
        
        warningBanner.createEl('p', {
            text: 'This version includes local AI but will not receive updates. Watch for the upcoming Ideatr Desktop App for local AI with ongoing support.',
            attr: { style: 'margin: 0.5em 0; line-height: 1.5;' }
        });
        
        warningBanner.createEl('a', {
            text: 'Learn more about Desktop App →',
            href: 'https://ideatr.app/desktop',
            attr: { 
                style: 'color: var(--text-accent); text-decoration: none;',
                target: '_blank'
            }
        });

        // Local AI settings
        new Setting(containerEl)
            .setName('Local AI')
            .setDesc('Use local AI model for idea enhancement (offline, free)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.llmProvider === 'llama')
                .onChange(async (value) => {
                    this.plugin.settings.llmProvider = value ? 'llama' : 'none';
                    await this.saveSettings();
                    this.refresh();
                }));

        // Model selection and configuration (only show if Local AI is enabled)
        if (this.plugin.settings.llmProvider === 'llama') {
            // Model selection dropdown - only show downloaded models
            new Setting(containerEl)
                .setName('Local AI Model')
                .setDesc('Select which downloaded model to use. Use "Manage AI Models" to download new models or see all available options.')
                .addDropdown(dropdown => {
                    // Initially show loading state
                    dropdown.addOption('loading', 'Loading...');
                    dropdown.setValue('loading');
                    dropdown.setDisabled(true);
                    
                    // Populate dropdown asynchronously
                    (async () => {
                        const downloadedModels = await this.getDownloadedModels();
                        
                        // Clear existing options by manipulating the select element directly
                        const selectEl = dropdown.selectEl as HTMLSelectElement;
                        // Clear options safely
                        while (selectEl.firstChild) {
                            selectEl.removeChild(selectEl.firstChild);
                        }
                        
                        if (downloadedModels.length === 0) {
                            // No models downloaded - show a message
                            dropdown.addOption('none', 'No models downloaded');
                            dropdown.setValue('none');
                            dropdown.setDisabled(true);
                            new Notice('No models downloaded. Use "Manage AI Models" to download a model.', 5000);
                        } else {
                            // Add only downloaded models to dropdown
                            for (const modelKey of downloadedModels) {
                                const modelConfig = MODELS[modelKey];
                                const displayText = `${modelConfig.name} [${modelConfig.badge}] (~${(modelConfig.sizeMB / 1000).toFixed(1)}GB, ${modelConfig.ram} RAM)`;
                                dropdown.addOption(modelKey, displayText);
                            }
                            
                            // Set current value, or default to first downloaded model if current isn't downloaded
                            const currentModel = this.plugin.settings.localModel || 'phi-3.5-mini';
                            const selectedModel = downloadedModels.includes(currentModel) 
                                ? currentModel 
                                : downloadedModels[0];
                            
                            dropdown.setValue(selectedModel);
                            dropdown.setDisabled(false);
                            
                            // Update settings if we had to change the model
                            if (selectedModel !== currentModel) {
                                // Type-safe assignment - selectedModel is guaranteed to be a valid model key
                                this.plugin.settings.localModel = selectedModel as IdeatrSettings['localModel'];
                                this.saveSettings(); // Don't await to avoid blocking
                            }
                        }
                    })();
                    
                    dropdown.onChange(async (value) => {
                        if (value === 'none' || value === 'loading') return;
                        
                        const modelKey = value as 'phi-3.5-mini' | 'qwen-2.5-7b' | 'llama-3.1-8b' | 'llama-3.3-70b';
                        
                        // Check system compatibility
                        const compatibility = checkModelCompatibility(modelKey);
                        
                        if (!compatibility.isCompatible) {
                            // Show warning and ask for confirmation
                            const systemInfo = getSystemInfoString();
                            const message = `${compatibility.warning}\n\n${compatibility.recommendation || ''}\n\n${systemInfo}\n\nDo you want to proceed anyway?`;
                            
                            // Use Obsidian confirmation modal
                            const proceed = await showConfirmation(this.app, message);
                            if (!proceed) {
                                // Reset to previous value
                                const downloadedModels = await this.getDownloadedModels();
                                const previousModel = downloadedModels.includes(this.plugin.settings.localModel || 'phi-3.5-mini')
                                    ? this.plugin.settings.localModel || 'phi-3.5-mini'
                                    : downloadedModels[0];
                                dropdown.setValue(previousModel);
                                return;
                            }
                        } else if (compatibility.warning) {
                            // Show warning but allow proceeding
                            const systemInfo = getSystemInfoString();
                            new Notice(`${compatibility.warning} ${systemInfo}`, 8000);
                        }
                        
                        this.plugin.settings.localModel = modelKey;
                        await this.saveSettings();
                        this.refresh(); // Refresh to show updated model info
                    });
                });

            // Model info display
            const modelManager = new ModelManager(this.plugin.settings.localModel || 'phi-3.5-mini');
            const modelConfig = modelManager.getModelConfig();

            new Setting(containerEl)
                .setName('Model Information')
                .setDesc(`${modelConfig.description}\nSize: ${(modelConfig.sizeMB / 1000).toFixed(1)}GB | RAM: ${modelConfig.ram} | Quality: ${modelConfig.quality}/5 | Speed: ${modelConfig.speed}/5`)
                .setDisabled(true);

            // Model download status with checksum indicator
            const modelStatusSetting = new Setting(containerEl)
                .setName('Model Status')
                .setDisabled(true);
            
            // Check download status and verify integrity asynchronously
            (async () => {
                const isDownloaded = await modelManager.isModelDownloaded();
                let statusText = isDownloaded
                    ? `Model downloaded: ${modelConfig.name}`
                    : 'Model not downloaded';
                
                if (isDownloaded) {
                    // Verify integrity
                    const isValid = await modelManager.verifyModelIntegrity();
                    const statusDesc = modelStatusSetting.descEl;
                    if (statusDesc) {
                        statusDesc.empty();
                        statusDesc.createSpan({ text: statusText + ' ' });
                        const statusIcon = statusDesc.createSpan({ 
                            cls: `model-status-icon ${isValid ? 'model-status-valid' : 'model-status-invalid'}`,
                            attr: { title: isValid ? 'File verified' : 'File verification failed' }
                        });
                        const iconSvg = isValid ? createCheckIcon(14) : createInfoIcon(14);
                        statusIcon.appendChild(iconSvg);
                    }
                } else {
                    modelStatusSetting.setDesc(statusText);
                }
            })();

            // Download/Switch Model button
            new Setting(containerEl)
                .setName('Manage AI Models')
                .setDesc('Download a new model, switch between models, or configure cloud AI providers')
                .addButton(button => button
                    .setButtonText('Manage AI Models')
                    .setCta()
                    .onClick(async () => {
                        const modal = new FirstLaunchSetupModal(
                            this.app,
                            modelManager,
                            this.plugin.settings,
                            async () => {
                                await this.saveSettings();
                                this.refresh();
                            }
                        );
                        modal.open();
                    }));

            new Setting(containerEl)
                .setName('Keep model loaded')
                .setDesc('Keep the AI model loaded in memory (uses ~4GB RAM, but faster responses)')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.keepModelLoaded)
                    .onChange(async (value) => {
                        this.plugin.settings.keepModelLoaded = value;
                        await this.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Preload on startup')
                .setDesc('Automatically load the AI model when Obsidian starts')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.preloadOnStartup)
                    .onChange(async (value) => {
                        this.plugin.settings.preloadOnStartup = value;
                        await this.saveSettings();
                    }));

            // Manual start button
            new Setting(containerEl)
                .setName('Ensure LLM Ready')
                .setDesc('Manually ensure the AI model is ready now. Not needed in most cases (model auto-starts when you use AI features), but helpful if: the model stopped unexpectedly, you want to test your configuration, or you prefer to preload before using features.')
                .addButton(button => button
                    .setButtonText('Ensure Ready')
                    .setCta()
                    .onClick(async () => {
                        button.setDisabled(true);
                        button.setButtonText('Preparing...');
                        try {
                            await this.plugin.ensureLLMReady();
                            new Notice('AI model is ready');
                            setTimeout(() => {
                                button.setDisabled(false);
                                button.setButtonText('Ensure Ready');
                            }, 2000);
                        } catch (error) {
                            new Notice('Failed to prepare model. Check console for details.');
                            button.setDisabled(false);
                            button.setButtonText('Ensure Ready');
                        }
                    }));
        }
    }
}

