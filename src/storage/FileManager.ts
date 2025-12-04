import type { Vault, TFile } from 'obsidian';
import type { IdeaInput } from '../types/idea';
import { generateFilename, addCollisionSuffix } from './FilenameGenerator';
import { buildFrontmatter, frontmatterToYAML } from '../metadata/FrontmatterBuilder';
import type { IdeaFrontmatter } from '../types/idea';
import { Logger } from '../utils/logger';

/**
 * FileManager - Handles file creation and management for ideas
 */

const IDEAS_DIRECTORY = 'Ideas';

export class FileManager {
    private vault: Vault;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    /**
     * Create an idea file in the vault
     * Returns the created file
     */
    async createIdeaFile(idea: IdeaInput): Promise<TFile> {
        // Ensure Ideas directory exists
        await this.ensureIdeasDirectory();

        // Generate filename
        const filename = generateFilename(idea.text, idea.timestamp);
        let filepath = `${IDEAS_DIRECTORY}/${filename}`;

        // Handle collisions
        filepath = this.resolveCollision(filepath);

        // Build frontmatter
        const frontmatter = buildFrontmatter(idea);
        const yaml = frontmatterToYAML(frontmatter);

        // Create file content
        const content = `${yaml}\n\n${idea.text}`;

        // Create file
        const file = await this.vault.create(filepath, content);
        return file;
    }

    /**
     * Ensure Ideas directory exists, create if missing
     */
    async ensureIdeasDirectory(): Promise<void> {
        const folder = this.vault.getAbstractFileByPath(IDEAS_DIRECTORY);

        if (!folder) {
            await this.vault.createFolder(IDEAS_DIRECTORY);
        }
    }

    /**
     * Resolve filename collisions by adding numeric suffix
     */
    private resolveCollision(filepath: string): string {
        let currentPath = filepath;
        let suffix = 2;

        while (this.vault.getAbstractFileByPath(currentPath)) {
            const filename = filepath.split('/').pop() || '';
            const suffixedFilename = addCollisionSuffix(filename, suffix);
            currentPath = `${IDEAS_DIRECTORY}/${suffixedFilename}`;
            suffix++;
        }

        return currentPath;
    }

    /**
     * Check if a file exists at the given path
     */
    fileExists(filepath: string): boolean {
        return this.vault.getAbstractFileByPath(filepath) !== null;
    }

    /**
     * Update frontmatter of an existing idea file
     */
    async updateIdeaFrontmatter(file: TFile, updates: Partial<IdeaFrontmatter>): Promise<void> {
        await this.vault.process(file, (content) => {
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);

            if (!match) {
                Logger.warn('No frontmatter found in file:', file.path);
                return content;
            }

            // Parse existing frontmatter (simple key-value parsing for now, or use Obsidian's API if available)
            // Since we don't have a full YAML parser, we'll use a regex replacement strategy for known fields
            // This is safer than trying to parse/stringify the whole block without a library

            let newFrontmatter = match[1];

            // Helper to replace or append field
            const updateField = (key: keyof IdeaFrontmatter, value: any) => {
                const stringValue = Array.isArray(value)
                    ? `[${value.join(', ')}]`
                    : value;

                const fieldRegex = new RegExp(`^${key}:.*$`, 'm');
                if (fieldRegex.test(newFrontmatter)) {
                    newFrontmatter = newFrontmatter.replace(fieldRegex, `${key}: ${stringValue}`);
                } else {
                    newFrontmatter += `\n${key}: ${stringValue}`;
                }
            };

            // Apply updates
            Object.entries(updates).forEach(([key, value]) => {
                updateField(key as keyof IdeaFrontmatter, value);
            });

            return content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
        });
    }

    /**
     * Append content to file body, replacing existing section if found
     * @param file - File to modify
     * @param sectionTitle - Section title (e.g., "Name Variants")
     * @param content - Content to append (markdown formatted)
     * @param replaceExisting - If true, replace existing section; if false, append new section
     */
    async appendToFileBody(
        file: TFile,
        sectionTitle: string,
        content: string,
        replaceExisting: boolean = true
    ): Promise<void> {
        await this.vault.process(file, (fileContent) => {
            const section = this.findSectionInContent(fileContent, sectionTitle);
            
            if (section && replaceExisting) {
                // Replace existing section
                const before = fileContent.substring(0, section.start);
                const after = fileContent.substring(section.end);
                
                // Ensure proper spacing
                const newContent = this.ensureSpacing(before, 'before') + content + this.ensureSpacing(after, 'after');
                return newContent;
            } else if (section && !replaceExisting) {
                // Append after existing section
                const before = fileContent.substring(0, section.end);
                const after = fileContent.substring(section.end);
                
                const newContent = this.ensureSpacing(before, 'before') + '\n\n' + content + this.ensureSpacing(after, 'after');
                return newContent;
            } else {
                // Append at end
                const newContent = this.ensureSpacing(fileContent, 'before') + '\n\n' + content;
                return newContent;
            }
        });
    }

    /**
     * Find section in content by title
     */
    private findSectionInContent(content: string, sectionTitle: string): { start: number; end: number } | null {
        // Escape special regex characters in sectionTitle
        const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Match: ## SectionTitle (case-insensitive, flexible whitespace)
        const headerPattern = new RegExp(`^##\\s+${escaped}\\s*$`, 'im');
        const match = content.match(headerPattern);
        
        if (!match || match.index === undefined) {
            return null;
        }
        
        const start = match.index;
        const headerEnd = start + match[0].length;
        
        // Find end of section (next ## header or blank line followed by non-list content)
        const afterHeader = content.substring(headerEnd);
        
        // First, check for next ## header
        const nextHeaderMatch = afterHeader.match(/^##\s+/m);
        if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
            return { start, end: headerEnd + nextHeaderMatch.index };
        }
        
        // If no next header, look for blank line followed by content that doesn't look like list items
        // This handles cases like "More content" after a section
        const blankLinePattern = /\n\n(?![\s]*[-*|])/;
        const blankLineMatch = afterHeader.match(blankLinePattern);
        if (blankLineMatch && blankLineMatch.index !== undefined) {
            // Check if content after blank line is not a list item
            const afterBlankLine = afterHeader.substring(blankLineMatch.index + 2);
            if (afterBlankLine.trim() && !afterBlankLine.match(/^\s*[-*|]/)) {
                // This looks like content after the section, so end the section before it
                return { start, end: headerEnd + blankLineMatch.index };
            }
        }
        
        // Default: section goes to end of file
        return { start, end: content.length };
    }

    /**
     * Ensure proper spacing in content
     */
    private ensureSpacing(text: string, position: 'before' | 'after' = 'before'): string {
        if (position === 'before') {
            // Ensure text ends with newline
            return text.endsWith('\n') ? text : text + '\n';
        } else {
            // Ensure text starts with newline
            return text.startsWith('\n') ? text : '\n' + text;
        }
    }
}
