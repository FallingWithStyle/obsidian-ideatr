import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { createHotkeyPicker } from '../../utils/hotkeyPicker';

export class CaptureModalSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Capture modal shortcuts' });

        // Capture Idea Hotkey
        new Setting(containerEl)
            .setName('Capture idea hotkey')
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setDesc('Keyboard shortcut for opening the Capture idea modal. Click the field and press your desired key combination. Note: This setting stores your preference. To actually bind the hotkey, you must also set it in Obsidian\'s Hotkeys settings (Settings → Hotkeys → search for "Capture idea").')
            .addText(text => {
                createHotkeyPicker(
                    text.inputEl,
                    this.plugin.settings.captureIdeaHotkey,
                    (shortcut) => {
                        void (async () => {
                            this.plugin.settings.captureIdeaHotkey = shortcut;
                            await this.saveSettings();
                        })();
                    }
                );
            });

        // Save Shortcut
        new Setting(containerEl)
            .setName('Save shortcut')
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setDesc('Keyboard shortcut for the Save button in the Capture idea modal. Click the field and press your desired key combination.')
            .addText(text => {
                createHotkeyPicker(
                    text.inputEl,
                    this.plugin.settings.captureSaveShortcut,
                    (shortcut) => {
                        void (async () => {
                            this.plugin.settings.captureSaveShortcut = shortcut;
                            await this.saveSettings();
                        })();
                    }
                );
            });

        // Ideate Shortcut
        new Setting(containerEl)
            .setName('Ideate shortcut')
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setDesc('Keyboard shortcut for the Ideate button in the Capture idea modal. Click the field and press your desired key combination.')
            .addText(text => {
                createHotkeyPicker(
                    text.inputEl,
                    this.plugin.settings.captureIdeateShortcut,
                    (shortcut) => {
                        void (async () => {
                            this.plugin.settings.captureIdeateShortcut = shortcut;
                            await this.saveSettings();
                        })();
                    }
                );
            });
    }
}

