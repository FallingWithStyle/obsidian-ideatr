import { Setting, Platform } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { FeatureRequestModal } from '../../views/FeatureRequestModal';

export class FeedbackSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('View existing issues')
            .setDesc('Browse and search existing bug reports and feature requests on GitHub')
            .addButton(button => button
                .setButtonText('View Issues')
                .onClick(() => {
                    window.open('https://github.com/FallingWithStyle/obsidian-ideatr/issues', '_blank');
                }));

        new Setting(containerEl)
            .setName('Submit Feedback')
            .setDesc('Report bugs, suggest features, or report performance issues. Error logs can be included to help diagnose issues.')
            .addButton(button => button
                .setButtonText('Submit Feedback')
                .setCta()
                .onClick(() => {
                    let obsidianVersion = 'Unknown';
                    try {
                        // @ts-ignore - Obsidian internal API
                        obsidianVersion = this.app.appVersion || this.app.version || 'Unknown';
                    } catch {
                        obsidianVersion = 'Unknown';
                    }

                    const systemInfo: FeatureRequestModal['systemInfo'] = {
                        obsidianVersion,
                        pluginVersion: this.plugin.manifest.version,
                        platform: Platform.isMobile ? 'mobile' : 'desktop',
                        os: Platform.isMacOS ? 'Mac' : Platform.isWin ? 'Windows' : Platform.isLinux ? 'Linux' : 'Unknown'
                    };

                    const modal = new FeatureRequestModal(
                        this.app,
                        systemInfo,
                        this.plugin.errorLogService
                    );
                    modal.open();
                }));
    }
}

