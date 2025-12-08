import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { FirstLaunchSetupModal } from '../../views/FirstLaunchSetupModal';
import { createHelpIcon } from '../../utils/HelpIcon';

export class LLMSettingsSection extends BaseSettingsSection {

    display(containerEl: HTMLElement): void {
        const titleContainer = containerEl.createDiv({ cls: 'settings-section-title' });
        titleContainer.createEl('h2', { text: 'AI configuration' });
        const helpIcon = createHelpIcon(this.app, 'getting-started', 'Learn about AI configuration');
        titleContainer.appendChild(helpIcon);

        // Cloud AI settings
        new Setting(containerEl)
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setName('Manage ai models')
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setDesc('Configure cloud ai providers (Anthropic, OpenAI, etc.)')
            .addButton(button => button
                // eslint-disable-next-line obsidianmd/ui/sentence-case
                .setButtonText('Manage ai models')
                .setCta()
                .onClick(() => {
                    const modal = new FirstLaunchSetupModal(
                        this.app,
                        null,
                        this.plugin.settings,
                        () => {
                            void (async () => {
                                await this.saveSettings();
                                this.refresh();
                            })();
                        }
                    );
                    modal.open();
                }));
    }
}

