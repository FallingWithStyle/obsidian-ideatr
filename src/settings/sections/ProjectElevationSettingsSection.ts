import { Setting } from 'obsidian';
import { BaseSettingsSection } from '../components/SettingsSection';

export class ProjectElevationSettingsSection extends BaseSettingsSection {
    display(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Enable Project Elevation')
            .setDesc('Allow elevating ideas to full projects')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableElevation)
                .onChange(async (value) => {
                    this.plugin.settings.enableElevation = value;
                    await this.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Projects Directory')
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
            .setName('Default Folders')
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
            .setName('Create Project Metadata')
            .setDesc('Create project metadata file for future project management integrations (planned expansion)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.elevationCreateDevraMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.elevationCreateDevraMetadata = value;
                    await this.saveSettings();
                }));

        const elevationHelp = containerEl.createDiv('setting-item-description');
        elevationHelp.style.marginTop = '10px';
        elevationHelp.style.padding = '10px';
        elevationHelp.style.backgroundColor = 'var(--background-secondary)';
        elevationHelp.style.borderRadius = '4px';
        elevationHelp.innerHTML = `
            <strong>About Project Elevation:</strong><br>
            Elevating an idea moves it from the Ideas/ directory to a project folder structure in ${this.plugin.settings.elevationProjectsDirectory || 'Projects'}/.
            The original idea file becomes the project's README.md, and default folders are created automatically.
            <br><br>
            <strong>Note:</strong> Folder structure customization is planned for v2. Currently, the default structure is used for all projects.
        `;
    }
}

