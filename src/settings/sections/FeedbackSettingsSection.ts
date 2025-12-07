import { Setting, Platform } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';
import { FeatureRequestModal } from '../../views/FeatureRequestModal';

export class FeedbackSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('View existing issues')
            .setDesc('Browse and search existing bug reports and feature requests on GitHub')
            .addButton(button => button
                .setButtonText('View issues')
                .onClick(() => {
                    window.open('https://github.com/FallingWithStyle/obsidian-ideatr/issues', '_blank');
                }));

        new Setting(containerEl)
            .setName('Submit feedback')
            .setDesc('Report bugs, suggest features, or report performance issues. Error logs can be included to help diagnose issues.')
            .addButton(button => button
                .setButtonText('Submit feedback')
                .setCta()
                .onClick(() => {
                    let obsidianVersion = 'Unknown';
                    try {
                    // @ts-expect-error - Obsidian internal API
                    const appVersion = (this.app as { appVersion?: string; version?: string }).appVersion;
                    const version = (this.app as { appVersion?: string; version?: string }).version;
                    obsidianVersion = appVersion ?? version ?? 'Unknown';
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

