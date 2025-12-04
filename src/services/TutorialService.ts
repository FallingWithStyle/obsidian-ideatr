import { App, Notice, TFile } from 'obsidian';
import { openTutorial, getTutorialPath, type TutorialTopic } from '../utils/HelpIcon';

/**
 * Service for managing tutorial access and navigation
 */
export class TutorialService {
    constructor(private app: App) {}

    /**
     * Open the tutorial index
     */
    async openIndex(): Promise<void> {
        const indexPaths = [
            'Tutorials/00-Index.md',
            'tutorials/00-Index.md', // backward compatibility
            'Ideatr/Tutorials/00-Index.md',
            'Ideatr/tutorials/00-Index.md',
        ];
        
        for (const indexPath of indexPaths) {
            const file = this.app.vault.getAbstractFileByPath(indexPath);
            if (file && file instanceof TFile) {
                await this.app.workspace.openLinkText(indexPath, '', true);
                return;
            }
        }

        // Fallback: show notice
        new Notice('Tutorial files not found. Please ensure tutorials are available in your vault.');
    }

    /**
     * Open a specific tutorial topic
     */
    async openTopic(topic: TutorialTopic): Promise<void> {
        await openTutorial(this.app, topic);
    }

    /**
     * Get the path to a tutorial file
     */
    getTutorialPath(topic: TutorialTopic): string {
        return getTutorialPath(topic);
    }

    /**
     * Check if tutorial files are available
     */
    areTutorialsAvailable(): boolean {
        const indexPaths = [
            'Tutorials/00-Index.md',
            'tutorials/00-Index.md', // backward compatibility
            'Ideatr/Tutorials/00-Index.md',
            'Ideatr/tutorials/00-Index.md',
        ];
        
        for (const indexPath of indexPaths) {
            const file = this.app.vault.getAbstractFileByPath(indexPath);
            if (file && file instanceof TFile) {
                return true;
            }
        }
        
        return false;
    }
}

