import { App, Notice, TFile } from 'obsidian';

/**
 * Tutorial topic identifiers for linking to specific tutorial sections
 */
export type TutorialTopic =
    | 'getting-started'
    | 'capture-workflows'
    | 'validation'
    | 'transformation'
    | 'lifecycle'
    | 'dashboard'
    | 'graph-view'
    | 'batch-operations'
    | 'advanced-features'
    | 'ideate-button'
    | 'save-button'
    | 'triage-inbox'
    | 'clusters'
    | 'resurfacing'
    | 'filters'
    | 'status-management'
    | 'domain-checking'
    | 'existence-search'
    | 'duplicate-detection'
    | 'related-notes'
    | 'name-variants'
    | 'scaffolds'
    | 'mutations'
    | 'expansion'
    | 'reorganization'
    | 'archiving'
    | 'codename'
    | 'project-elevation';

/**
 * Mapping of tutorial topics to tutorial file names and optional anchors
 */
const TUTORIAL_MAP: Record<TutorialTopic, { file: string; anchor?: string }> = {
    'getting-started': { file: '01-Getting-Started.md' },
    'capture-workflows': { file: '02-Capture-Workflows.md' },
    'validation': { file: '03-Validation-Guide.md' },
    'transformation': { file: '04-Transformation-Tools.md' },
    'lifecycle': { file: '05-Lifecycle-Management.md' },
    'dashboard': { file: '06-Dashboard-Guide.md' },
    'graph-view': { file: '07-Graph-View-Guide.md' },
    'batch-operations': { file: '08-Batch-Operations.md' },
    'advanced-features': { file: '09-Advanced-Features.md' },
    'ideate-button': { file: '02-Capture-Workflows.md' },
    'save-button': { file: '02-Capture-Workflows.md' },
    'triage-inbox': { file: '06-Dashboard-Guide.md', anchor: '#triage-inbox' },
    'clusters': { file: '06-Dashboard-Guide.md', anchor: '#clusters-panel' },
    'resurfacing': { file: '06-Dashboard-Guide.md', anchor: '#resurfacing-panel' },
    'filters': { file: '06-Dashboard-Guide.md', anchor: '#filtering' },
    'status-management': { file: '05-Lifecycle-Management.md', anchor: '#status-management' },
    'domain-checking': { file: '03-Validation-Guide.md', anchor: '#domain-checking' },
    'existence-search': { file: '03-Validation-Guide.md', anchor: '#existence-search' },
    'duplicate-detection': { file: '03-Validation-Guide.md', anchor: '#duplicate-detection' },
    'related-notes': { file: '03-Validation-Guide.md', anchor: '#related-notes-discovery' },
    'name-variants': { file: '04-Transformation-Tools.md', anchor: '#name-variants' },
    'scaffolds': { file: '04-Transformation-Tools.md', anchor: '#scaffolds' },
    'mutations': { file: '04-Transformation-Tools.md', anchor: '#mutations' },
    'expansion': { file: '04-Transformation-Tools.md', anchor: '#expansion' },
    'reorganization': { file: '04-Transformation-Tools.md', anchor: '#reorganization' },
    'archiving': { file: '05-Lifecycle-Management.md', anchor: '#archiving-ideas' },
    'codename': { file: '05-Lifecycle-Management.md', anchor: '#codename-generation' },
    'project-elevation': { file: '05-Lifecycle-Management.md', anchor: '#project-elevation' },
};

/**
 * Get the tutorial file path for a given topic
 */
export function getTutorialPath(topic: TutorialTopic): string {
    const mapping = TUTORIAL_MAP[topic];
    if (!mapping) {
        return 'tutorials/00-Index.md';
    }
    const anchor = mapping.anchor ? `#${mapping.anchor.replace('#', '')}` : '';
    return `tutorials/${mapping.file}${anchor}`;
}

/**
 * Open a tutorial file in Obsidian
 */
export async function openTutorial(app: App, topic: TutorialTopic): Promise<void> {
    const tutorialPath = getTutorialPath(topic);
    
    // Try to find the tutorial file
    // First, check if it's in the plugin directory (for bundled tutorials)
    // Then check if it's in the vault root or a tutorials folder
    
    const possiblePaths = [
        tutorialPath,
        `Ideatr/${tutorialPath}`,
        `Ideatr/tutorials/${TUTORIAL_MAP[topic].file}`,
    ];

    for (const path of possiblePaths) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file && file instanceof TFile) {
            await app.workspace.openLinkText(path, '', true);
            return;
        }
    }

    // If file not found, try to open the index
    const indexPaths = ['tutorials/00-Index.md', 'Ideatr/tutorials/00-Index.md'];
    for (const indexPath of indexPaths) {
        const indexFile = app.vault.getAbstractFileByPath(indexPath);
        if (indexFile && indexFile instanceof TFile) {
            await app.workspace.openLinkText(indexFile.path, '', true);
            return;
        }
    }
    
    // Fallback: show notice
    new Notice(`Tutorial file not found. Please ensure tutorials are available in your vault.`);
}

/**
 * Create a help icon element that opens a tutorial when clicked
 */
export function createHelpIcon(
    app: App,
    topic: TutorialTopic,
    tooltip?: string
): HTMLElement {
    const icon = document.createElement('span');
    icon.addClass('ideatr-help-icon');
    icon.setAttribute('aria-label', tooltip || 'Get help');
    icon.innerHTML = '?';
    icon.style.cursor = 'pointer';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.width = '16px';
    icon.style.height = '16px';
    icon.style.borderRadius = '50%';
    icon.style.backgroundColor = 'var(--background-modifier-border)';
    icon.style.color = 'var(--text-muted)';
    icon.style.fontSize = '12px';
    icon.style.fontWeight = 'bold';
    icon.style.marginLeft = '4px';
    icon.style.verticalAlign = 'middle';
    icon.style.lineHeight = '1';
    
    // Hover effect
    icon.addEventListener('mouseenter', () => {
        icon.style.backgroundColor = 'var(--interactive-accent)';
        icon.style.color = 'var(--text-on-accent)';
    });
    
    icon.addEventListener('mouseleave', () => {
        icon.style.backgroundColor = 'var(--background-modifier-border)';
        icon.style.color = 'var(--text-muted)';
    });

    // Click handler
    icon.addEventListener('click', async (e) => {
        e.stopPropagation();
        await openTutorial(app, topic);
    });

    // Tooltip
    if (tooltip) {
        icon.setAttribute('title', tooltip);
    }

    return icon;
}

