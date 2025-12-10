import { App, PluginSettingTab, Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { TutorialManager } from '../../services/TutorialManager';
import type IdeatrPlugin from '../../main';
import { joinPath, resolvePath, isAbsolutePath } from '../../utils/pathUtils';
import { showConfirmation } from '../../utils/confirmation';

export class TutorialSettingsSection extends BaseSettingsSection {
    private tutorialManager: TutorialManager;

    constructor(app: App, plugin: IdeatrPlugin, settingsTab?: PluginSettingTab) {
        super(app, plugin, settingsTab);
        
        // Get plugin directory for tutorial manager (same approach as ServiceInitializer)
        // Vault adapter may have basePath property but it's not in the public API
        const vaultBasePath = (app.vault.adapter as { basePath?: string }).basePath ?? app.vault.configDir;
        const configDir = isAbsolutePath(app.vault.configDir) 
            ? app.vault.configDir
            : joinPath(vaultBasePath, app.vault.configDir);
        const pluginDir = resolvePath(joinPath(configDir, 'plugins', plugin.manifest.id));
        
        this.tutorialManager = new TutorialManager(app, pluginDir);
    }

    display(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Tutorials' });

        new Setting(containerEl)
            .setName('Open tutorials')
            .setDesc('Open the tutorial index to browse all available guides')
            .addButton(button => button
                .setButtonText('Open tutorials')
                .setCta()
                .onClick(async () => {
                    const { TutorialService } = await import('../../services/TutorialService');
                    const tutorialService = new TutorialService(this.app);
                    await tutorialService.openIndex();
                }));

        new Setting(containerEl)
            .setName('Reset tutorials')
            .setDesc('Restore tutorial files from the plugin. Use this if tutorials were deleted, modified, or corrupted.')
            .addButton(button => button
                .setButtonText('Reset tutorials')
                .setWarning()
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Resetting...');
                    try {
                        const success = await this.tutorialManager.resetTutorials(true); // overwrite=true
                        if (success) {
                            // Refresh settings to update status
                            setTimeout(() => this.refresh(), 1000);
                        }
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Reset tutorials');
                    }
                }));

        new Setting(containerEl)
            .setName('Delete tutorials')
            // eslint-disable-next-line obsidianmd/ui/sentence-case -- Description references command name "Reset tutorials" which must match the actual command name
            .setDesc('Remove all tutorial files from your vault. You can restore them later using "Reset tutorials".')
            .addButton(button => button
                .setButtonText('Delete tutorials')
                .setWarning()
                .onClick(async () => {
                    // Confirm deletion
                    const confirmed = await showConfirmation(
                        this.app,
                        'Are you sure you want to delete all tutorial files? ' +
                        'You can restore them later using "Reset tutorials".'
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
                        button.setButtonText('Delete tutorials');
                    }
                }));

        // Status display
        void this.displayStatus(containerEl);
    }

    private async displayStatus(containerEl: HTMLElement): Promise<void> {
        const statusContainer = containerEl.createDiv('tutorial-status');
        
        const tutorialsExist = this.tutorialManager.tutorialsExistInVault();
        const bundledAvailable = await this.tutorialManager.bundledTutorialsAvailable();
        
        let statusText = '';
        let statusDesc = '';
        
        if (tutorialsExist) {
            statusText = 'Tutorials: installed';
            statusDesc = 'Tutorial files are available in your vault.';
        } else if (bundledAvailable) {
            statusText = 'Tutorials: not installed';
            statusDesc = 'Tutorial files are not in your vault, but can be restored from the plugin.';
        } else {
            statusText = 'Tutorials: unavailable';
            statusDesc = 'Tutorial files are not available. They may need to be manually added.';
        }

        new Setting(statusContainer)
            .setName('Status')
            .setDesc(statusDesc)
            .setDisabled(true)
            .addText(text => text.setValue(statusText));
    }
}

