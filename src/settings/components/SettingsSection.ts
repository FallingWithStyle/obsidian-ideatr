import { HTMLElement } from 'obsidian';
import type IdeatrPlugin from '../../main';

/**
 * Base interface for settings sections
 */
export interface SettingsSection {
    display(containerEl: HTMLElement): void;
}

/**
 * Base class for settings sections
 */
export abstract class BaseSettingsSection implements SettingsSection {
    protected settingsTab?: any;

    constructor(
        protected app: any,
        protected plugin: IdeatrPlugin,
        settingsTab?: any
    ) {
        this.settingsTab = settingsTab;
    }

    abstract display(containerEl: HTMLElement): void;

    protected async saveSettings(): Promise<void> {
        await this.plugin.saveSettings();
    }

    protected refresh(): void {
        if (this.settingsTab && this.settingsTab.display) {
            this.settingsTab.display();
        }
    }
}

