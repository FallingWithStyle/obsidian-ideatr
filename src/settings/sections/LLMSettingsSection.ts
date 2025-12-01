import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { FirstLaunchSetupModal } from '../../views/FirstLaunchSetupModal';
import { ModelManager } from '../../services/ModelManager';

export class LLMSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'AI Configuration' });

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

        // Model download status
        if (this.plugin.settings.llmProvider === 'llama') {
            const modelStatus = this.plugin.settings.modelDownloaded 
                ? `Model downloaded (${this.plugin.settings.modelPath || 'configured'})`
                : 'Model not downloaded';
            
            new Setting(containerEl)
                .setName('Model Status')
                .setDesc(modelStatus)
                .setDisabled(true);

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

            // Setup AI button (if not configured)
            if (!this.plugin.settings.setupCompleted) {
                new Setting(containerEl)
                    .setName('Setup AI')
                    .setDesc('Configure AI model download or API key')
                    .addButton(button => button
                        .setButtonText('Setup AI')
                        .setCta()
                        .onClick(() => {
                            const modelManager = new ModelManager();
                            new FirstLaunchSetupModal(
                                this.app,
                                modelManager,
                                this.plugin.settings,
                                async () => {
                                    await this.saveSettings();
                                    this.refresh();
                                }
                            ).open();
                        }));
            }
        }
    }
}

