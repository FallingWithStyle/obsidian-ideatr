import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class CaptureModalSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Capture Modal Shortcuts' });

        new Setting(containerEl)
            .setName('Save Shortcut')
            .setDesc('Keyboard shortcut for the Save button in the Capture Idea modal. Format: "cmd+enter", "ctrl+enter", "alt+enter", etc.')
            .addText(text => text
                .setPlaceholder('cmd+enter')
                .setValue(this.plugin.settings.captureSaveShortcut)
                .onChange(async (value) => {
                    this.plugin.settings.captureSaveShortcut = value.toLowerCase().trim();
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Ideate Shortcut')
            .setDesc('Keyboard shortcut for the Ideate button in the Capture Idea modal. Format: "cmd+enter", "ctrl+enter", "alt+enter", etc.')
            .addText(text => text
                .setPlaceholder('ctrl+enter')
                .setValue(this.plugin.settings.captureIdeateShortcut)
                .onChange(async (value) => {
                    this.plugin.settings.captureIdeateShortcut = value.toLowerCase().trim();
                    await this.saveSettings();
                }));
    }
}

