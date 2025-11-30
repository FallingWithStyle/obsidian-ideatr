import type { ILLMService, ClassificationResult } from '../types/classification';
import type { Mutation, MutationOptions, ExpansionResult, ExpansionOptions, ReorganizationResult, ReorganizationOptions } from '../types/transformation';
import { PROMPTS } from './prompts';

/**
 * HybridLLM - Manages both local and cloud LLM providers with intelligent routing
 */
export class HybridLLM implements ILLMService {
    private localLLM: ILLMService;
    private cloudLLM: ILLMService | null;
    private preferCloud: boolean;
    private lastProvider: 'local' | 'cloud' | null = null;

    constructor(
        localLLM: ILLMService,
        cloudLLM: ILLMService | null,
        preferCloud: boolean
    ) {
        this.localLLM = localLLM;
        this.cloudLLM = cloudLLM;
        this.preferCloud = preferCloud;
    }

    async classify(text: string): Promise<ClassificationResult> {
        // Try cloud first if preferred and available
        if (this.preferCloud && this.cloudLLM?.isAvailable()) {
            try {
                const result = await this.cloudLLM.classify(text);
                this.lastProvider = 'cloud';
                console.log(`[HybridLLM] Used cloud provider: ${(this.cloudLLM as any).name || 'cloud'}`);
                return result;
            } catch (error) {
                console.warn('[HybridLLM] Cloud provider failed, falling back to local:', error);
                // Fall through to local
            }
        }

        // Use local AI
        const result = await this.localLLM.classify(text);
        this.lastProvider = 'local';
        console.log('[HybridLLM] Used local provider');
        return result;
    }

    isAvailable(): boolean {
        return this.localLLM.isAvailable() || (this.cloudLLM?.isAvailable() ?? false);
    }

    /**
     * Ensure the LLM service is ready - delegates to the appropriate provider
     */
    async ensureReady(): Promise<void> {
        // Try to ensure cloud is ready first if preferred
        if (this.preferCloud && this.cloudLLM?.isAvailable() && this.cloudLLM.ensureReady) {
            try {
                await this.cloudLLM.ensureReady();
                return;
            } catch (error) {
                console.warn('[HybridLLM] Cloud provider ensureReady failed, falling back to local:', error);
            }
        }

        // Ensure local LLM is ready
        if (this.localLLM.ensureReady) {
            await this.localLLM.ensureReady();
        }
    }

    /**
     * Get the last provider that was used for classification
     */
    getLastProvider(): 'local' | 'cloud' | null {
        return this.lastProvider;
    }

    /**
     * Update cloud LLM provider (for runtime switching)
     */
    setCloudLLM(cloudLLM: ILLMService | null): void {
        this.cloudLLM = cloudLLM;
        this.lastProvider = null; // Reset last provider
    }

    /**
     * Update preference for cloud vs local
     */
    setPreferCloud(preferCloud: boolean): void {
        this.preferCloud = preferCloud;
    }

    /**
     * Generic completion method - delegates to available LLM
     */
    async complete(
        prompt: string,
        options?: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
        }
    ): Promise<string> {
        // Try cloud first if preferred and available
        if (this.preferCloud && this.cloudLLM?.isAvailable() && this.cloudLLM.complete) {
            try {
                const result = await this.cloudLLM.complete(prompt, options);
                this.lastProvider = 'cloud';
                return result;
            } catch (error) {
                console.warn('[HybridLLM] Cloud provider failed, falling back to local:', error);
                // Fall through to local
            }
        }

        // Use local AI
        if (this.localLLM.complete) {
            const result = await this.localLLM.complete(prompt, options);
            this.lastProvider = 'local';
            return result;
        }

        throw new Error('No LLM service available with complete() method');
    }

    /**
     * Generate idea mutations
     */
    async generateMutations(
        text: string,
        options?: MutationOptions
    ): Promise<Mutation[]> {
        const prompt = PROMPTS.mutations({
            ideaText: text,
            category: options?.category,
            tags: options?.tags,
            count: options?.count,
            focus: options?.focus,
        });

        const response = await this.complete(prompt, {
            temperature: 0.8, // Higher creativity for mutations
            n_predict: 2000,
        });

        // Parse JSON response
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            const jsonText = jsonMatch ? jsonMatch[0] : response;
            const mutations = JSON.parse(jsonText) as Mutation[];
            return mutations;
        } catch (error) {
            console.error('Failed to parse mutations JSON:', error);
            throw new Error('Failed to parse mutations from LLM response');
        }
    }

    /**
     * Expand an idea
     */
    async expandIdea(
        text: string,
        options?: ExpansionOptions
    ): Promise<ExpansionResult> {
        const prompt = PROMPTS.expansion({
            ideaText: text,
            category: options?.category,
            tags: options?.tags,
            detailLevel: options?.detailLevel,
        });

        const expandedText = await this.complete(prompt, {
            temperature: 0.7,
            n_predict: 3000,
        });

        // Parse structure from markdown
        const structure = this.parseExpansionStructure(expandedText);

        return {
            expandedText,
            structure,
        };
    }

    /**
     * Reorganize an idea
     */
    async reorganizeIdea(
        text: string,
        options?: ReorganizationOptions
    ): Promise<ReorganizationResult> {
        const prompt = PROMPTS.reorganization({
            ideaText: text,
            category: options?.category,
            tags: options?.tags,
            preserveSections: options?.preserveSections,
            targetStructure: options?.targetStructure,
        });

        const reorganizedText = await this.complete(prompt, {
            temperature: 0.5, // Lower temperature for more consistent reorganization
            n_predict: 4000,
        });

        // Analyze changes (simplified - would need more sophisticated diff in production)
        const changes = this.analyzeReorganizationChanges(text, reorganizedText);

        return {
            reorganizedText,
            changes,
            originalLength: text.length,
            reorganizedLength: reorganizedText.length,
        };
    }

    /**
     * Parse expansion structure from markdown text
     */
    private parseExpansionStructure(text: string): ExpansionResult['structure'] {
        const structure: ExpansionResult['structure'] = {};

        // Extract sections using markdown headers
        const overviewMatch = text.match(/## Overview\s*\n([\s\S]*?)(?=\n## |$)/);
        if (overviewMatch) {
            structure.overview = overviewMatch[1].trim();
        }

        const featuresMatch = text.match(/## (?:Key Features|Mechanics)\s*\n([\s\S]*?)(?=\n## |$)/);
        if (featuresMatch) {
            structure.features = featuresMatch[1].trim();
        }

        const goalsMatch = text.match(/## (?:Goals|Objectives)\s*\n([\s\S]*?)(?=\n## |$)/);
        if (goalsMatch) {
            structure.goals = goalsMatch[1].trim();
        }

        const challengesMatch = text.match(/## (?:Potential )?Challenges\s*\n([\s\S]*?)(?=\n## |$)/);
        if (challengesMatch) {
            structure.challenges = challengesMatch[1].trim();
        }

        const nextStepsMatch = text.match(/## Next Steps\s*\n([\s\S]*?)(?=\n## |$)/);
        if (nextStepsMatch) {
            structure.nextSteps = nextStepsMatch[1].trim();
        }

        return structure;
    }

    /**
     * Analyze reorganization changes (simplified version)
     */
    private analyzeReorganizationChanges(
        original: string,
        reorganized: string
    ): ReorganizationResult['changes'] {
        // Extract section headers from both texts
        const originalSections = this.extractSections(original);
        const reorganizedSections = this.extractSections(reorganized);

        const sectionsAdded = reorganizedSections.filter(
            s => !originalSections.includes(s)
        );
        const sectionsRemoved = originalSections.filter(
            s => !reorganizedSections.includes(s)
        );
        const sectionsReorganized = originalSections.filter(
            s => reorganizedSections.includes(s) && 
                 reorganizedSections.indexOf(s) !== originalSections.indexOf(s)
        );

        return {
            sectionsAdded,
            sectionsRemoved,
            sectionsReorganized,
        };
    }

    /**
     * Extract section headers from markdown text
     */
    private extractSections(text: string): string[] {
        const sectionRegex = /^## (.+)$/gm;
        const sections: string[] = [];
        let match;
        while ((match = sectionRegex.exec(text)) !== null) {
            sections.push(match[1].trim());
        }
        return sections;
    }
}

