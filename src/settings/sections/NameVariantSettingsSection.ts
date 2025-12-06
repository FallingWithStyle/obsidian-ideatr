import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class NameVariantSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable name variants')
            .setDesc('Generate name variants for ideas')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableNameVariants)
                .onChange(async (value) => {
                    this.plugin.settings.enableNameVariants = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-generate variants on capture')
            .setDesc('Automatically generate name variants when capturing ideas')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoGenerateVariants)
                .onChange(async (value) => {
                    this.plugin.settings.autoGenerateVariants = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max variants (5-10)')
            .setDesc('Maximum number of name variants to generate')
            .addText(text => text
                .setPlaceholder('8')
                .setValue(String(this.plugin.settings.maxVariants))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 5 && numValue <= 10) {
                        this.plugin.settings.maxVariants = numValue;
                        await this.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Use LLM for name extraction')
            .setDesc('Use AI to intelligently extract idea names (more accurate but slower)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useLLMForNameExtraction)
                .onChange(async (value) => {
                    this.plugin.settings.useLLMForNameExtraction = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Cache max size')
            .setDesc('Maximum number of cached variants (0 = unlimited)')
            .addText(text => text
                .setPlaceholder('100')
                .setValue(String(this.plugin.settings.variantCacheMaxSize || 0))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                        this.plugin.settings.variantCacheMaxSize = numValue;
                        await this.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Persist cache to disk')
            .setDesc('Save variant cache to disk (survives plugin reloads)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.variantCachePersist)
                .onChange(async (value) => {
                    this.plugin.settings.variantCachePersist = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Clear variant cache')
            .setDesc('Clear all cached name variants')
            .addButton(button => button
                .setButtonText('Clear cache')
                .setCta()
                .onClick(async () => {
                    if (this.plugin.nameVariantService) {
                        this.plugin.nameVariantService.clearCache();
                        new Notice('Variant cache cleared');
                    }
                }));
    }
}

