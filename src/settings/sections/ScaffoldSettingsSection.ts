import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class ScaffoldSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable Scaffolds')
            .setDesc('Generate scaffold templates for ideas')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableScaffolds)
                .onChange(async (value) => {
                    this.plugin.settings.enableScaffolds = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Scaffold default action')
            .setDesc('Default action when generating scaffold: append to current note or create new note')
            .addDropdown(dropdown => dropdown
                .addOption('append', 'Append to current note')
                .addOption('new-note', 'Create new note')
                .setValue(this.plugin.settings.scaffoldDefaultAction)
                .onChange(async (value) => {
                    this.plugin.settings.scaffoldDefaultAction = value as 'append' | 'new-note';
                    await this.saveSettings();
                }));
    }
}

