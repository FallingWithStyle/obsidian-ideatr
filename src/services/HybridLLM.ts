import type { ILLMService, ClassificationResult } from '../types/classification';
import type { Mutation, MutationOptions, ExpansionResult, ExpansionOptions, ReorganizationResult, ReorganizationOptions } from '../types/transformation';
import { PROMPTS } from './prompts';
import { extractAndRepairJSON } from '../utils/jsonRepair';
import { GRAMMARS } from '../utils/grammars';
import { Logger } from '../utils/logger';

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
                Logger.debug('Used cloud provider:', (this.cloudLLM as any).name || 'cloud');
                return result;
            } catch (error) {
                Logger.warn('Cloud provider failed, falling back to local:', error);
                // Fall through to local
            }
        }

        // Use local AI
        const result = await this.localLLM.classify(text);
        this.lastProvider = 'local';
        Logger.debug('Used local provider');
        return result;
    }

    isAvailable(): boolean {
        return this.localLLM.isAvailable() || (this.cloudLLM?.isAvailable() ?? false);
    }

    /**
     * Ensure the LLM service is ready - delegates to the appropriate provider
     */
    async ensureReady(): Promise<boolean> {
        // Try to ensure cloud is ready first if preferred and available
        if (this.preferCloud && this.cloudLLM?.isAvailable() && this.cloudLLM.ensureReady) {
            try {
                const ready = await this.cloudLLM.ensureReady();
                if (ready) {
                    return true;
                }
            } catch (error) {
                Logger.warn('Cloud provider ensureReady failed, falling back to local:', error);
            }
        }

        // Ensure local LLM is ready (only if available)
        if (this.localLLM.isAvailable() && this.localLLM.ensureReady) {
            return await this.localLLM.ensureReady();
        }

        return false;
    }

    /**
     * Get the last provider that was used for classification
     */
    getLastProvider(): 'local' | 'cloud' | null {
        return this.lastProvider;
    }

    /**
     * Get the underlying local LLM service (for status checking)
     */
    getLocalLLM(): ILLMService {
        return this.localLLM;
    }

    /**
     * Get the underlying cloud LLM service (for status checking)
     */
    getCloudLLM(): ILLMService | null {
        return this.cloudLLM;
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
                Logger.warn('Cloud provider failed, falling back to local:', error);
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
    private shouldUseLocalLLM(): boolean {
        return !(this.preferCloud && this.cloudLLM?.isAvailable());
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

        const isLocal = this.shouldUseLocalLLM();
        const llmOptions: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
            grammar?: string;
        } = {
            temperature: 0.8, // Higher creativity for mutations
            n_predict: 4000, // Increased to handle longer JSON responses
            stop: ['\n]', ']'], // Stop at end of JSON array
        };

        if (isLocal) {
            llmOptions.grammar = GRAMMARS.mutations;
        }

        const response = await this.complete(prompt, llmOptions);

        // Check for empty response
        if (!response || response.trim().length === 0) {
            throw new Error('LLM returned an empty response. The model may have stopped generating or encountered an error. Please try again.');
        }

        // Parse JSON response
        try {
            const repaired = extractAndRepairJSON(response, true);
            const mutations = JSON.parse(repaired) as Mutation[];

            // Validate mutations array
            if (!Array.isArray(mutations)) {
                throw new Error('Response is not an array');
            }

            // Filter and validate each mutation
            const validMutations = mutations
                .filter((m: unknown): m is { text?: unknown; title?: unknown; description?: unknown; differences?: unknown } => 
                    typeof m === 'object' && m !== null && (('text' in m) || ('title' in m) || ('description' in m))
                )
                .map((m) => ({
                    title: m.title || (m as { text?: unknown }).text || '',
                    description: m.description || '',
                    differences: Array.isArray(m.differences) ? m.differences : [],
                } as Mutation));

            if (validMutations.length > 0) {
                return validMutations;
            }

            throw new Error('No valid mutations found in response');
        } catch (error) {
            Logger.warn('JSON parsing failed:', error);
            Logger.debug('Raw response:', response);
            throw new Error('Failed to parse mutations from AI response. Please try again.');
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

    /**
     * Cleanup both local and cloud providers
     * Called on plugin unload
     */
    cleanup(): void {
        Logger.debug('HybridLLM cleanup started');

        // Local LLM cleanup is handled by singleton destroy
        // Just cleanup cloud provider if it has cleanup method
        if (this.cloudLLM) {
            (this.cloudLLM as any).cleanup?.();
        }

        Logger.debug('HybridLLM cleanup completed');
    }
}

