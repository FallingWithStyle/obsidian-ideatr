/**
 * Modal for editing related notes - allows adding and removing related IDs
 */

import { App, Modal, Notice, SuggestModal } from 'obsidian';
import type { IIdeaRepository } from '../types/management';
import { RelatedIdConverter } from '../utils/RelatedIdConverter';

interface RelatedNoteDisplay {
    id: number;
    title: string;
    path: string;
}

export class EditRelatedNotesModal extends Modal {
    private currentRelatedIds: number[];
    private ideaRepository: IIdeaRepository;
    private idConverter: RelatedIdConverter;
    private onSave?: (relatedIds: number[]) => void;
    private relatedNotes: RelatedNoteDisplay[] = [];
    private currentFileId: number | null;

    constructor(
        app: App,
        currentRelatedIds: number[],
        ideaRepository: IIdeaRepository,
        currentFileId: number | null,
        onSave?: (relatedIds: number[]) => void
    ) {
        super(app);
        this.currentRelatedIds = [...currentRelatedIds];
        this.ideaRepository = ideaRepository;
        this.idConverter = new RelatedIdConverter(ideaRepository);
        this.onSave = onSave;
        this.currentFileId = currentFileId;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Edit related notes' });

        const description = contentEl.createEl('p', {
            text: 'Add or remove related notes. Click "add related note" to search for ideas to link.'
        });
        description.addClass('ideatr-modal-description');

        // Load current related notes
        await this.loadRelatedNotes();

        // Display current related notes
        const listContainer = contentEl.createDiv('ideatr-related-list');
        listContainer.setCssProps({
            'margin-bottom': '20px',
            'max-height': '300px',
            'overflow-y': 'auto'
        });

        this.renderRelatedNotes(listContainer);

        // Add button
        const addButton = contentEl.createEl('button', {
            text: 'Add related note',
            cls: 'mod-cta'
        });
        addButton.setCssProps({
            'margin-bottom': '10px'
        });
        addButton.addEventListener('click', () => {
            void this.showAddRelatedNoteModal();
        });

        // Buttons container
        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        buttonContainer.setCssProps({
            'margin-top': '20px',
            'display': 'flex',
            'gap': '10px'
        });

        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });
        saveButton.addEventListener('click', () => {
            this.handleSave();
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
    }

    private async loadRelatedNotes() {
        this.relatedNotes = [];
        for (const id of this.currentRelatedIds) {
            if (id === 0) continue; // Skip invalid IDs
            
            try {
                const title = await this.idConverter.idToTitle(id);
                const paths = await this.idConverter.idsToPaths([id]);
                const path = paths[0] || '';
                
                this.relatedNotes.push({
                    id,
                    title: title ?? `ID: ${id}`,
                    path
                });
            } catch {
                // If lookup fails, still show the ID
                this.relatedNotes.push({
                    id,
                    title: `ID: ${id}`,
                    path: ''
                });
            }
        }
    }

    private renderRelatedNotes(container: HTMLElement) {
        container.empty();

        if (this.relatedNotes.length === 0) {
            container.createEl('p', {
                text: 'No related notes. Click "add related note" to link ideas.',
                attr: { style: 'color: var(--text-muted); font-style: italic;' }
            });
            return;
        }

        this.relatedNotes.forEach((note) => {
            const item = container.createDiv('ideatr-related-item');
            item.setCssProps({
                'display': 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'padding': '8px',
                'margin-bottom': '8px',
                'background-color': 'var(--background-secondary)',
                'border-radius': '4px'
            });

            const label = item.createDiv('ideatr-related-label');
            label.setCssProps({
                'flex': '1'
            });
            label.createEl('strong', { text: note.title });
            if (note.path) {
                label.createEl('div', {
                    text: note.path,
                    cls: 'ideatr-related-path',
                    attr: { style: 'font-size: 12px; color: var(--text-muted);' }
                });
            }

            const removeButton = item.createEl('button', {
                text: 'Remove',
                attr: { style: 'margin-left: 10px;' }
            });
            removeButton.addEventListener('click', () => {
                this.removeRelatedNote(note.id);
            });
        });
    }

    private removeRelatedNote(id: number) {
        this.currentRelatedIds = this.currentRelatedIds.filter(relatedId => relatedId !== id);
        void this.loadRelatedNotes().then(() => {
            const listContainer = this.contentEl.querySelector('.ideatr-related-list');
            if (listContainer) {
                this.renderRelatedNotes(listContainer as HTMLElement);
            }
        });
    }

    private async showAddRelatedNoteModal() {
        const allIdeas = await this.ideaRepository.getAllIdeas();
        
        // Filter out current file and already related notes
        const availableIdeas = allIdeas.filter(idea => {
            const ideaId = idea.frontmatter.id;
            if (!ideaId || ideaId === 0) return false;
            if (ideaId === this.currentFileId) return false;
            if (this.currentRelatedIds.includes(ideaId)) return false;
            return true;
        });

        if (availableIdeas.length === 0) {
            new Notice('No available ideas to link.');
            return;
        }

        new IdeaPickerModal(
            this.app,
            availableIdeas.map(idea => ({
                id: idea.frontmatter.id ?? 0,
                title: idea.filename.replace(/\.md$/, ''),
                path: `Ideas/${idea.filename}`
            })),
            (selected) => {
                if (!this.currentRelatedIds.includes(selected.id)) {
                    this.currentRelatedIds.push(selected.id);
                    void this.loadRelatedNotes().then(() => {
                        const listContainer = this.contentEl.querySelector('.ideatr-related-list');
                        if (listContainer) {
                            this.renderRelatedNotes(listContainer as HTMLElement);
                        }
                    });
                }
            }
        ).open();
    }

    private handleSave() {
        // Filter out invalid IDs
        const validIds = this.currentRelatedIds.filter(id => id !== 0);
        
        if (this.onSave) {
            this.onSave(validIds);
        }
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Suggest modal for picking an idea to link
 */
class IdeaPickerModal extends SuggestModal<RelatedNoteDisplay> {
    private ideas: RelatedNoteDisplay[];
    private onSelect: (idea: RelatedNoteDisplay) => void;

    constructor(
        app: App,
        ideas: RelatedNoteDisplay[],
        onSelect: (idea: RelatedNoteDisplay) => void
    ) {
        super(app);
        this.ideas = ideas;
        this.onSelect = onSelect;
        this.setPlaceholder('Search for an idea to link...');
    }

    getSuggestions(query: string): RelatedNoteDisplay[] {
        if (!query) {
            return this.ideas.slice(0, 50);
        }

        const queryLower = query.toLowerCase();
        return this.ideas
            .filter(idea =>
                idea.title.toLowerCase().includes(queryLower) ||
                idea.path.toLowerCase().includes(queryLower) ||
                idea.id.toString().includes(query)
            )
            .slice(0, 50);
    }

    renderSuggestion(idea: RelatedNoteDisplay, el: HTMLElement) {
        el.createEl('div', {
            text: idea.title,
            attr: { style: 'font-weight: bold;' }
        });
        el.createEl('div', {
            text: idea.path,
            attr: { style: 'font-size: 12px; color: var(--text-muted);' }
        });
    }

    onChooseSuggestion(idea: RelatedNoteDisplay) {
        this.onSelect(idea);
    }
}

