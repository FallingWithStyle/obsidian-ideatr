import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class ProjectElevationSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable project elevation')
            .setDesc('Allow elevating ideas to full projects')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableElevation)
                .onChange(async (value) => {
                    this.plugin.settings.enableElevation = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Projects directory')
            .setDesc('Directory where elevated projects will be created (relative to vault root)')
            .addText(text => text
                .setPlaceholder('Projects')
                .setValue(this.plugin.settings.elevationProjectsDirectory)
                .onChange(async (value) => {
                    const sanitized = value.trim().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-');
                    this.plugin.settings.elevationProjectsDirectory = sanitized || 'Projects';
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default folders')
            .setDesc('Comma-separated list of folders to create in each elevated project (e.g., docs,notes,assets)')
            .addText(text => text
                .setPlaceholder('docs,notes,assets')
                .setValue(this.plugin.settings.elevationDefaultFolders)
                .onChange(async (value) => {
                    const sanitized = value
                        .split(',')
                        .map(f => f.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
                        .filter(f => f.length > 0)
                        .join(',');
                    this.plugin.settings.elevationDefaultFolders = sanitized || 'docs,notes,assets';
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Create project metadata')
            .setDesc('Create project metadata file for future project management integrations (planned expansion)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.elevationCreateDevraMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.elevationCreateDevraMetadata = value;
                    await this.saveSettings();
                }));

        const elevationHelp = containerEl.createDiv('setting-item-description');
        (elevationHelp as HTMLElement).setCssProps({
            'margin-top': '10px',
            'padding': '10px',
            'background-color': 'var(--background-secondary)',
            'border-radius': '4px'
        });
        
        // Build help text safely (prevents XSS from settings values)
        const projectsDir = this.plugin.settings.elevationProjectsDirectory || 'Projects';
        elevationHelp.createEl('strong', { text: 'About project elevation:' });
        elevationHelp.createEl('br');
        elevationHelp.createEl('span', { 
            text: `Elevating an idea moves it from the Ideas/ directory to a project folder structure in ${projectsDir}/. The original idea file becomes the project's README.md, and default folders are created automatically.` 
        });
        elevationHelp.createEl('br');
        elevationHelp.createEl('br');
        elevationHelp.createEl('strong', { text: 'Note:' });
        elevationHelp.createEl('span', { 
            text: ' Folder structure customization is planned for v2. Currently, the default structure is used for all projects.' 
        });
    }
}

