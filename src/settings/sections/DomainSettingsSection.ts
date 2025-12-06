import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class DomainSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable domain checking')
            .setDesc('Check domain availability for extracted domains')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDomainCheck)
                .onChange(async (value) => {
                    this.plugin.settings.enableDomainCheck = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-check domains on capture')
            .setDesc('Automatically check domains when capturing ideas')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoCheckDomains)
                .onChange(async (value) => {
                    this.plugin.settings.autoCheckDomains = value;
                    await this.saveSettings();
                }));

        if (this.plugin.settings.enableProspectr) {
            new Setting(containerEl)
                .setName('Domain checking service URL')
                .setDesc('URL of the domain checking service (planned expansion)')
                .addText(text => text
                    .setPlaceholder('http://localhost:3000')
                    .setValue(this.plugin.settings.prospectrUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.prospectrUrl = value;
                        await this.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('Domain check timeout (ms)')
            .setDesc('Maximum time to wait for domain check response')
            .addText(text => text
                .setPlaceholder('10000')
                .setValue(String(this.plugin.settings.domainCheckTimeout))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.domainCheckTimeout = numValue;
                        await this.saveSettings();
                    }
                }));
    }
}

