import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class ErrorLoggingSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable error logging')
            .setDesc('Collect error logs for bug reports. Logs are stored locally and only sent if you choose to include them.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.errorLoggingEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.errorLoggingEnabled = value;
                    await this.saveSettings();
                    if (this.plugin.errorLogService) {
                        this.plugin.errorLogService.updateSettings({
                            enabled: value,
                            maxEntries: this.plugin.settings.errorLogMaxEntries,
                            retentionDays: this.plugin.settings.errorLogRetentionDays
                        });
                    }
                }));

        new Setting(containerEl)
            .setName('Maximum log entries')
            .setDesc('Maximum number of error log entries to keep in memory (default: 50)')
            .addText(text => text
                .setPlaceholder('50')
                .setValue(String(this.plugin.settings.errorLogMaxEntries))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= 500) {
                        this.plugin.settings.errorLogMaxEntries = numValue;
                        await this.saveSettings();
                        if (this.plugin.errorLogService) {
                            this.plugin.errorLogService.updateSettings({
                                enabled: this.plugin.settings.errorLoggingEnabled,
                                maxEntries: numValue,
                                retentionDays: this.plugin.settings.errorLogRetentionDays
                            });
                        }
                    }
                }));

        new Setting(containerEl)
            .setName('Log retention (days)')
            .setDesc('Number of days to retain error logs (default: 7)')
            .addText(text => text
                .setPlaceholder('7')
                .setValue(String(this.plugin.settings.errorLogRetentionDays))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= 30) {
                        this.plugin.settings.errorLogRetentionDays = numValue;
                        await this.saveSettings();
                        if (this.plugin.errorLogService) {
                            this.plugin.errorLogService.updateSettings({
                                enabled: this.plugin.settings.errorLoggingEnabled,
                                maxEntries: this.plugin.settings.errorLogMaxEntries,
                                retentionDays: numValue
                            });
                        }
                    }
                }));

        new Setting(containerEl)
            .setName('Clear error logs')
            .setDesc('Clear all stored error logs')
            .addButton(button => button
                .setButtonText('Clear logs')
                .onClick(() => {
                    if (this.plugin.errorLogService) {
                        this.plugin.errorLogService.clearLogs();
                        new Notice('Error logs cleared');
                    }
                }));
    }
}

