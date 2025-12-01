import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { createHotkeyPicker } from '../../utils/hotkeyPicker';

export class CaptureModalSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Capture Modal Shortcuts' });

        // Capture Idea Hotkey
        new Setting(containerEl)
            .setName('Capture Idea Hotkey')
            .setDesc('Keyboard shortcut for opening the Capture Idea modal. Click the field and press your desired key combination. Note: This setting stores your preference. To actually bind the hotkey, you must also set it in Obsidian\'s Hotkeys settings (Settings → Hotkeys → search for "Capture Idea").')
            .addText(text => {
                createHotkeyPicker(
                    text.inputEl,
                    this.plugin.settings.captureIdeaHotkey,
                    async (shortcut) => {
                        this.plugin.settings.captureIdeaHotkey = shortcut;
                        await this.saveSettings();
                    }
                );
            });

        // Save Shortcut
        new Setting(containerEl)
            .setName('Save Shortcut')
            .setDesc('Keyboard shortcut for the Save button in the Capture Idea modal. Click the field and press your desired key combination.')
            .addText(text => {
                createHotkeyPicker(
                    text.inputEl,
                    this.plugin.settings.captureSaveShortcut,
                    async (shortcut) => {
                        this.plugin.settings.captureSaveShortcut = shortcut;
                        await this.saveSettings();
                    }
                );
            });

        // Ideate Shortcut
        new Setting(containerEl)
            .setName('Ideate Shortcut')
            .setDesc('Keyboard shortcut for the Ideate button in the Capture Idea modal. Click the field and press your desired key combination.')
            .addText(text => {
                createHotkeyPicker(
                    text.inputEl,
                    this.plugin.settings.captureIdeateShortcut,
                    async (shortcut) => {
                        this.plugin.settings.captureIdeateShortcut = shortcut;
                        await this.saveSettings();
                    }
                );
            });
    }
}

