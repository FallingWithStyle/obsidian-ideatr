import type { IScaffoldService, ScaffoldTemplate } from '../types/transformation';
import type { IdeaCategory } from '../types/classification';
import { templates as defaultTemplates, selectTemplate as selectDefaultTemplate } from './templates';
import { extractIdeaNameSync } from './NameVariantService';
import type { Vault, App } from 'obsidian';
import { TFile } from 'obsidian';
import { Logger } from '../utils/logger';

const TEMPLATES_DIR = '.ideatr/templates';

/**
 * ScaffoldService - Generates scaffold templates for ideas
 * Supports custom templates stored in vault
 */
export class ScaffoldService implements IScaffoldService {
    private vault?: Vault;
    private app?: App;
    private customTemplates: ScaffoldTemplate[] = [];
    private allTemplates: ScaffoldTemplate[] = [];

    constructor(vault?: Vault, app?: App) {
        this.vault = vault;
        this.app = app;
        this.allTemplates = [...defaultTemplates];
        if (vault) {
            this.loadCustomTemplates().catch(err => {
                Logger.warn('Failed to load custom templates:', err);
            });
        }
    }

    /**
     * Load custom templates from vault
     */
    async loadCustomTemplates(): Promise<void> {
        if (!this.vault) return;

        try {
            // Ensure templates directory exists
            const templatesDir = this.vault.getAbstractFileByPath(TEMPLATES_DIR);
            if (!templatesDir) {
                // Directory doesn't exist, no custom templates
                this.updateAllTemplates();
                return;
            }

            // Load all JSON files in templates directory
            const files = this.vault.getFiles().filter(file => 
                file.path.startsWith(TEMPLATES_DIR + '/') && file.extension === 'json'
            );

            const loadedTemplates: ScaffoldTemplate[] = [];
            for (const file of files) {
                try {
                    const content = await this.vault.read(file);
                    const template = JSON.parse(content) as ScaffoldTemplate;
                    // Validate template structure
                    if (this.validateTemplate(template)) {
                        loadedTemplates.push(template);
                    } else {
                        Logger.warn(`Invalid template structure in ${file.path}`);
                    }
                } catch (error) {
                    Logger.warn(`Failed to load template from ${file.path}:`, error);
                }
            }

            this.customTemplates = loadedTemplates;
            this.updateAllTemplates();
        } catch (error) {
            Logger.warn('Failed to load custom templates:', error);
            this.updateAllTemplates();
        }
    }

    /**
     * Update all templates (merge custom with defaults, custom overrides)
     */
    private updateAllTemplates(): void {
        const templateMap = new Map<string, ScaffoldTemplate>();
        
        // Add default templates first
        for (const template of defaultTemplates) {
            templateMap.set(template.id, template);
        }
        
        // Override with custom templates
        for (const template of this.customTemplates) {
            templateMap.set(template.id, template);
        }
        
        this.allTemplates = Array.from(templateMap.values());
    }

    /**
     * Validate template structure
     */
    private validateTemplate(template: unknown): template is ScaffoldTemplate {
        if (!template || typeof template !== 'object') {
            return false;
        }
        const t = template as Record<string, unknown>;
        return (
            typeof t.id === 'string' &&
            typeof t.name === 'string' &&
            Array.isArray(t.categories) &&
            Array.isArray(t.sections) &&
            t.sections.every((s: unknown) => {
                if (!s || typeof s !== 'object') return false;
                const section = s as Record<string, unknown>;
                return typeof section.title === 'string' && typeof section.content === 'string';
            })
        );
    }

    /**
     * Save a custom template to vault
     */
    async saveCustomTemplate(template: ScaffoldTemplate): Promise<void> {
        if (!this.vault) {
            throw new Error('Vault not available for saving templates');
        }

        // Ensure templates directory exists
        const templatesDir = this.vault.getAbstractFileByPath(TEMPLATES_DIR);
        if (!templatesDir) {
            await this.vault.createFolder(TEMPLATES_DIR);
        }

        // Save template as JSON file
        const filename = `${template.id}.json`;
        const filepath = `${TEMPLATES_DIR}/${filename}`;
        const content = JSON.stringify(template, null, 2);

        const existingFile = this.vault.getAbstractFileByPath(filepath);
        if (existingFile && existingFile instanceof TFile) {
            await this.vault.modify(existingFile, content);
        } else {
            await this.vault.create(filepath, content);
        }

        // Reload templates
        await this.loadCustomTemplates();
    }

    /**
     * Delete a custom template
     */
    async deleteCustomTemplate(templateId: string): Promise<void> {
        if (!this.vault) {
            throw new Error('Vault not available for deleting templates');
        }

        const filepath = `${TEMPLATES_DIR}/${templateId}.json`;
        const file = this.vault.getAbstractFileByPath(filepath);
        
        if (file && file instanceof TFile) {
            if (this.app) {
                await this.app.fileManager.trashFile(file);
            } else if (this.vault) {
                // eslint-disable-next-line obsidianmd/prefer-file-manager-trash-file
                await this.vault.delete(file);
            }
            await this.loadCustomTemplates();
        }
    }

    getAvailableTemplates(): ScaffoldTemplate[] {
        return this.allTemplates;
    }

    isAvailable(): boolean {
        return true; // Service is always available
    }

    generateScaffold(
        ideaText: string,
        category: IdeaCategory,
        ideaName?: string
    ): string {
        // Extract idea name if not provided (use sync version for scaffolds - fast enough)
        const name = ideaName ?? extractIdeaNameSync(ideaText);
        
        // Select template based on category (use custom templates if available)
        const template = this.selectTemplate(category);
        
        // Build variable map
        const variables: Record<string, string> = {
            ideaName: name,
            ideaText: ideaText || '',
            category: category || 'uncategorized',
            created: new Date().toISOString().split('T')[0],
            tags: '' // Could extract from frontmatter if available
        };
        
        // Generate sections
        const sections = template.sections.map(section => {
            let content = this.substituteVariables(section.content, variables);
            
            // Add questions if present
            if (section.questions && section.questions.length > 0) {
                const questionsList = section.questions.map(q => `- ${q}`).join('\n');
                content += `\n\n### Questions to Consider\n\n${questionsList}`;
            }
            
            return content;
        });
        
        // Combine sections
        return sections.join('\n\n');
    }

    /**
     * Select template based on category (supports custom templates)
     */
    private selectTemplate(category: IdeaCategory): ScaffoldTemplate {
        // Use default selection logic but with custom templates
        const templateId = selectDefaultTemplate(category).id;
        return this.allTemplates.find(t => t.id === templateId) ?? 
               this.allTemplates.find(t => t.id === 'generic-idea') ?? 
               this.allTemplates[0];
    }

    /**
     * Substitute variables in template content
     */
    private substituteVariables(content: string, variables: Record<string, string>): string {
        let result = content;
        
        for (const [key, value] of Object.entries(variables)) {
            const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(pattern, value || '');
        }
        
        return result;
    }
}

