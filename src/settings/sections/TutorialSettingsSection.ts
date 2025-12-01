import { Setting, Notice } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { TutorialManager } from '../../services/TutorialManager';
import type IdeatrPlugin from '../../main';
import * as path from 'path';

export class TutorialSettingsSection extends BaseSettingsSection {
    private tutorialManager: TutorialManager;

    constructor(app: any, plugin: IdeatrPlugin, settingsTab?: any) {
        super(app, plugin, settingsTab);
        
        // Get plugin directory for tutorial manager (same approach as ServiceInitializer)
        const vaultBasePath = (app.vault.adapter as any).basePath || app.vault.configDir;
        const configDir = path.isAbsolute(app.vault.configDir) 
            ? app.vault.configDir 
            : path.join(vaultBasePath, app.vault.configDir);
        const pluginDir = path.resolve(path.join(configDir, 'plugins', plugin.manifest.id));
        
        this.tutorialManager = new TutorialManager(app, pluginDir);
    }

    display(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Tutorials' });

        new Setting(containerEl)
            .setName('Open Tutorials')
            .setDesc('Open the tutorial index to browse all available guides')
            .addButton(button => button
                .setButtonText('Open Tutorials')
                .setCta()
                .onClick(async () => {
                    const { TutorialService } = await import('../../services/TutorialService');
                    const tutorialService = new TutorialService(this.app);
                    await tutorialService.openIndex();
                }));

        new Setting(containerEl)
            .setName('Reset Tutorials')
            .setDesc('Restore tutorial files from the plugin. Use this if tutorials were deleted, modified, or corrupted.')
            .addButton(button => button
                .setButtonText('Reset Tutorials')
                .setWarning()
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Resetting...');
                    try {
                        const success = await this.tutorialManager.resetTutorials();
                        if (success) {
                            // Refresh settings to update status
                            setTimeout(() => this.refresh(), 1000);
                        }
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Reset Tutorials');
                    }
                }));

        new Setting(containerEl)
            .setName('Delete Tutorials')
            .setDesc('Remove all tutorial files from your vault. You can restore them later using "Reset Tutorials".')
            .addButton(button => button
                .setButtonText('Delete Tutorials')
                .setWarning()
                .onClick(async () => {
                    // Confirm deletion
                    const confirmed = confirm(
                        'Are you sure you want to delete all tutorial files? ' +
                        'You can restore them later using "Reset Tutorials".'
                    );
                    
                    if (!confirmed) {
                        return;
                    }

                    button.setDisabled(true);
                    button.setButtonText('Deleting...');
                    try {
                        const success = await this.tutorialManager.deleteTutorials();
                        if (success) {
                            // Refresh settings to update status
                            setTimeout(() => this.refresh(), 1000);
                        }
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Delete Tutorials');
                    }
                }));

        // Status display
        this.displayStatus(containerEl);
    }

    private async displayStatus(containerEl: HTMLElement): Promise<void> {
        const statusContainer = containerEl.createDiv('tutorial-status');
        
        const tutorialsExist = await this.tutorialManager.tutorialsExistInVault();
        const bundledAvailable = await this.tutorialManager.bundledTutorialsAvailable();
        
        let statusText = '';
        let statusDesc = '';
        
        if (tutorialsExist) {
            statusText = 'Tutorials: Installed';
            statusDesc = 'Tutorial files are available in your vault.';
        } else if (bundledAvailable) {
            statusText = 'Tutorials: Not Installed';
            statusDesc = 'Tutorial files are not in your vault, but can be restored from the plugin.';
        } else {
            statusText = 'Tutorials: Unavailable';
            statusDesc = 'Tutorial files are not available. They may need to be manually added.';
        }

        new Setting(statusContainer)
            .setName('Status')
            .setDesc(statusDesc)
            .setDisabled(true)
            .addText(text => text.setValue(statusText));
    }
}

