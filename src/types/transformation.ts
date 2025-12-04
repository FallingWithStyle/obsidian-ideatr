/**
 * Type definitions for transformation services (name variants, scaffolds)
 */
import type { IdeaCategory } from './classification';

/**
 * Name variant type
 */
export type NameVariantType = 
    | 'synonym' 
    | 'short' 
    | 'domain-hack' 
    | 'phonetic' 
    | 'portmanteau' 
    | 'made-up';

/**
 * Name variant result
 */
export interface NameVariant {
    text: string;
    type: NameVariantType;
    quality?: number; // Optional quality score (0-1, higher is better)
}

/**
 * Name variant service interface
 */
export interface INameVariantService {
    /**
     * Generate name variants from idea text
     * @param ideaText - Full idea text
     * @param ideaName - Optional pre-extracted idea name (if not provided, will extract)
     * @returns Array of name variants
     */
    generateVariants(ideaText: string, ideaName?: string): Promise<NameVariant[]>;

    /**
     * Format variants as markdown for file body
     * @param variants - Array of name variants
     * @returns Formatted markdown string
     */
    formatVariantsForMarkdown(variants: NameVariant[]): string;

    /**
     * Check if name variant service is available
     */
    isAvailable(): boolean;
}

/**
 * Template section within a scaffold
 */
export interface TemplateSection {
    title: string;
    content: string; // Markdown with {{variables}}
    questions?: string[]; // Optional questions to include
}

/**
 * Scaffold template definition
 */
export interface ScaffoldTemplate {
    id: string;
    name: string;
    categories: string[]; // Which categories use this template (IdeaCategory[])
    sections: TemplateSection[];
}

/**
 * Scaffold service interface
 */
export interface IScaffoldService {
    /**
     * Generate scaffold content for an idea
     * @param ideaText - Full idea text
     * @param category - Idea category
     * @param ideaName - Optional pre-extracted idea name
     * @returns Formatted scaffold content (markdown)
     */
    generateScaffold(
        ideaText: string,
        category: IdeaCategory,
        ideaName?: string
    ): string;

    /**
     * Get available scaffold templates
     */
    getAvailableTemplates(): ScaffoldTemplate[];

    /**
     * Check if scaffold service is available
     */
    isAvailable(): boolean;
}

/**
 * Mutation result - a variation of an idea
 */
export interface Mutation {
    title: string;
    description: string;
    differences: string[];
}

/**
 * Mutation result type
 */
export type MutationResult = Mutation[];

/**
 * Mutation options for LLM generation
 */
export interface MutationOptions {
    count?: number;
    focus?: string;
    category?: IdeaCategory;
    tags?: string[];
}

/**
 * Expansion result - expanded idea with structure
 */
export interface ExpansionResult {
    expandedText: string; // Markdown formatted
    structure: {
        overview?: string;
        features?: string;
        goals?: string;
        challenges?: string;
        nextSteps?: string;
    };
}

/**
 * Expansion options for LLM generation
 */
export interface ExpansionOptions {
    detailLevel?: 'brief' | 'detailed' | 'comprehensive';
    category?: IdeaCategory;
    tags?: string[];
}

/**
 * Reorganization result - reorganized idea with change tracking
 */
export interface ReorganizationResult {
    reorganizedText: string; // Markdown formatted
    changes: {
        sectionsAdded: string[];
        sectionsRemoved: string[];
        sectionsReorganized: string[];
    };
    originalLength: number;
    reorganizedLength: number;
}

/**
 * Reorganization options for LLM generation
 */
export interface ReorganizationOptions {
    preserveSections?: string[];
    targetStructure?: string[];
    category?: IdeaCategory;
    tags?: string[];
}

/**
 * Transformation operation type
 */
export interface TransformationOperation {
    type: string;
    target: string;
    action: string;
    parameters?: Record<string, unknown>;
}

/**
 * Transformation plan from intent analysis
 */
export interface TransformationPlan {
    intent: 'organize' | 'expand' | 'transform' | 'analyze' | 'restructure' | 'custom';
    operations: TransformationOperation[];
    description: string;
    requiresFileRename?: boolean;
    requiresFrontmatterUpdate?: boolean;
    requiresBodyModification?: boolean;
}

/**
 * Transformation result
 */
export interface TransformationResult {
    newFilename?: string | null;
    frontmatter?: Record<string, unknown>;
    body?: string;
    summary: string;
    originalContent?: string;
}

