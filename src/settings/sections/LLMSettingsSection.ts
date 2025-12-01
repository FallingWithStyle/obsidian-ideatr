import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { FirstLaunchSetupModal } from '../../views/FirstLaunchSetupModal';
import { ModelManager } from '../../services/ModelManager';
import { createHelpIcon } from '../../utils/HelpIcon';

export class LLMSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        const titleContainer = containerEl.createDiv({ cls: 'settings-section-title' });
        titleContainer.createEl('h2', { text: 'AI Configuration' });
        const helpIcon = createHelpIcon(this.app, 'getting-started', 'Learn about AI Configuration');
        titleContainer.appendChild(helpIcon);

        // Local AI settings
        new Setting(containerEl)
            .setName('Local AI')
            .setDesc('Use local Llama model for classification (offline, free)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.llmProvider === 'llama')
                .onChange(async (value) => {
                    this.plugin.settings.llmProvider = value ? 'llama' : 'none';
                    await this.saveSettings();
                    this.refresh();
                }));

        // Model selection and configuration (only show if Local AI is enabled)
        if (this.plugin.settings.llmProvider === 'llama') {
            // Model selection dropdown
            new Setting(containerEl)
                .setName('Local AI Model')
                .setDesc('Choose which model to download. Larger models are more accurate but require more RAM.')
                .addDropdown(dropdown => dropdown
                    .addOption('phi-3.5-mini', 'Phi-3.5 Mini [EFFICIENT] (~4.2GB, 6-8GB RAM)')
                    .addOption('qwen-2.5-7b', 'Qwen 2.5 7B [VERSATILE] (~7.8GB, 10GB RAM)')
                    .addOption('llama-3.1-8b', 'Llama 3.1 8B [RELIABLE] (~8.5GB, 10-12GB RAM)')
                    .addOption('llama-3.3-70b', 'Llama 3.3 70B [PREMIUM] (~43GB, 48GB+ RAM)')
                    .setValue(this.plugin.settings.localModel || 'phi-3.5-mini')
                    .onChange(async (value) => {
                        this.plugin.settings.localModel = value as 'phi-3.5-mini' | 'qwen-2.5-7b' | 'llama-3.1-8b' | 'llama-3.3-70b';
                        await this.saveSettings();
                        this.refresh(); // Refresh to show updated model info
                    }));

            // Model info display
            const modelManager = new ModelManager(this.plugin.settings.localModel || 'phi-3.5-mini');
            const modelConfig = modelManager.getModelConfig();

            new Setting(containerEl)
                .setName('Model Information')
                .setDesc(`${modelConfig.description}\nSize: ${(modelConfig.sizeMB / 1000).toFixed(1)}GB | RAM: ${modelConfig.ram} | Quality: ${modelConfig.quality}/5 | Speed: ${modelConfig.speed}/5`)
                .setDisabled(true);

            // Model download status
            const modelStatus = this.plugin.settings.modelDownloaded
                ? `Model downloaded: ${modelConfig.name}`
                : 'Model not downloaded';

            new Setting(containerEl)
                .setName('Model Status')
                .setDesc(modelStatus)
                .setDisabled(true);

            // Download/Switch Model button
            new Setting(containerEl)
                .setName('Download/Switch Model')
                .setDesc('Download or switch to the selected model')
                .addButton(button => button
                    .setButtonText('Download Model')
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

