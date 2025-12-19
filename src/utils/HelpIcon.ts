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
        return 'Tutorials/00-Index.md';
    }
    const anchor = mapping.anchor ? `#${mapping.anchor.replace('#', '')}` : '';
    return `Tutorials/${mapping.file}${anchor}`;
}

/**
 * Open a tutorial file in Obsidian
 */
export async function openTutorial(app: App, topic: TutorialTopic): Promise<void> {
    const tutorialPath = getTutorialPath(topic);
    const mapping = TUTORIAL_MAP[topic];
    
    // Try to find the tutorial file
    // First, check if it's in the plugin directory (for bundled tutorials)
    // Then check if it's in the vault root or a tutorials folder
    // Check both capitalized and lowercase for backward compatibility
    
    const possiblePaths = [
        tutorialPath, // Tutorials/XX-File.md (capitalized)
        tutorialPath.replace('Tutorials/', 'tutorials/'), // tutorials/XX-File.md (lowercase, backward compat)
        `Ideatr/${tutorialPath}`,
        `Ideatr/${tutorialPath.replace('Tutorials/', 'tutorials/')}`,
        `Ideatr/Tutorials/${mapping.file}`,
        `Ideatr/tutorials/${mapping.file}`,
    ];

    for (const path of possiblePaths) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file && file instanceof TFile) {
            await app.workspace.openLinkText(path, '', true);
            return;
        }
    }

    // If file not found, try to open the index (check both cases)
    const indexPaths = [
        'Tutorials/00-Index.md',
        'tutorials/00-Index.md', // backward compatibility
        'Ideatr/Tutorials/00-Index.md',
        'Ideatr/tutorials/00-Index.md',
    ];
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
    icon.setAttribute('aria-label', tooltip ?? 'Get help');
    icon.textContent = '?';
    icon.setCssProps({
        'cursor': 'pointer',
        'display': 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        'width': '16px',
        'height': '16px',
        'border-radius': '50%',
        'background-color': 'var(--background-modifier-border)',
        'color': 'var(--text-muted)',
        'font-size': '12px',
        'font-weight': 'bold',
        'margin-left': '4px',
        'vertical-align': 'middle',
        'line-height': '1'
    });
    
    // Hover effect
    icon.addEventListener('mouseenter', () => {
        icon.setCssProps({
            'background-color': 'var(--interactive-accent)',
            'color': 'var(--text-on-accent)'
        });
    });
    
    icon.addEventListener('mouseleave', () => {
        icon.setCssProps({
            'background-color': 'var(--background-modifier-border)',
            'color': 'var(--text-muted)'
        });
    });

    // Click handler
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        void openTutorial(app, topic);
    });

    // Tooltip
    if (tooltip) {
        icon.setAttribute('title', tooltip);
    }

    return icon;
}

