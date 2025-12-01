import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class WebSearchSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable Web Search')
            .setDesc('Search for similar ideas/products/services on the web')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableWebSearch)
                .onChange(async (value) => {
                    this.plugin.settings.enableWebSearch = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-search existence on capture')
            .setDesc('Automatically search for similar items when capturing ideas')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoSearchExistence)
                .onChange(async (value) => {
                    this.plugin.settings.autoSearchExistence = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Web Search Provider')
            .setDesc('Select the web search provider to use')
            .addDropdown(dropdown => dropdown
                .addOption('google', 'Google')
                .addOption('duckduckgo', 'DuckDuckGo')
                .addOption('none', 'None')
                .setValue(this.plugin.settings.webSearchProvider)
                .onChange(async (value) => {
                    this.plugin.settings.webSearchProvider = value as 'google' | 'duckduckgo' | 'none';
                    await this.saveSettings();
                    this.refresh();
                }));

        if (this.plugin.settings.webSearchProvider === 'google') {
            new Setting(containerEl)
                .setName('Google API Key')
                .setDesc('Google Custom Search API key')
                .addText(text => text
                    .setPlaceholder('Enter your Google API key')
                    .setValue(this.plugin.settings.googleSearchApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.googleSearchApiKey = value;
                        await this.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Google Search Engine ID')
                .setDesc('Google Custom Search Engine ID (CSE ID)')
                .addText(text => text
                    .setPlaceholder('Enter your Google CSE ID')
                    .setValue(this.plugin.settings.googleSearchEngineId)
                    .onChange(async (value) => {
                        this.plugin.settings.googleSearchEngineId = value;
                        await this.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('Web search timeout (ms)')
            .setDesc('Maximum time to wait for web search response')
            .addText(text => text
                .setPlaceholder('15000')
                .setValue(String(this.plugin.settings.webSearchTimeout))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.webSearchTimeout = numValue;
                        await this.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Max search results (1-10)')
            .setDesc('Maximum number of search results to store in frontmatter')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(String(this.plugin.settings.maxSearchResults))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
                        this.plugin.settings.maxSearchResults = numValue;
                        await this.saveSettings();
                    }
                }));
    }
}

