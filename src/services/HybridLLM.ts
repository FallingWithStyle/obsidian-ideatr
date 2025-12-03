import type { ILLMService, ClassificationResult } from '../types/classification';
import type { Mutation, MutationOptions, ExpansionResult, ExpansionOptions, ReorganizationResult, ReorganizationOptions } from '../types/transformation';
import { PROMPTS } from './prompts';
import { extractAndRepairJSON } from '../utils/jsonRepair';
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
            n_predict: 4000, // Increased to handle longer JSON responses
            stop: ['\n]', ']'], // Stop at end of JSON array (prefer newline before bracket for cleaner output)
        });

        // Check for empty response
        if (!response || response.trim().length === 0) {
            throw new Error('LLM returned an empty response. The model may have stopped generating or encountered an error. Please try again.');
        }

        // Parse JSON response with multiple strategies
        let parseError: Error | null = null;

        // Strategy 1: Direct extraction and repair
        try {
            const repaired = extractAndRepairJSON(response, true);
            const mutations = JSON.parse(repaired) as Mutation[];

            // Validate mutations array
            if (!Array.isArray(mutations)) {
                throw new Error('Response is not an array');
            }

            // Filter and validate each mutation
            const validMutations = mutations
                .filter((m: any) => m && typeof m === 'object' && (m.text || m.title || m.description))
                .map((m: any) => ({
                    title: m.title || m.text || '',
                    description: m.description || '',
                    differences: Array.isArray(m.differences) ? m.differences : [],
                } as Mutation));

            if (validMutations.length > 0) {
                return validMutations;
            }

            throw new Error('No valid mutations found in response');
        } catch (error) {
            parseError = error instanceof Error ? error : new Error(String(error));
            Logger.warn('Strategy 1 failed, trying alternative approaches:', parseError.message);
        }

        // Strategy 2: Try parsing without repair first (in case it's already valid)
        try {
            // Try to find and extract just the JSON array
            const arrayMatch = response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                const mutations = JSON.parse(arrayMatch[0]) as Mutation[];
                if (Array.isArray(mutations) && mutations.length > 0) {
                    const validMutations = mutations
                        .filter((m: any) => m && typeof m === 'object' && (m.text || m.title || m.description))
                        .map((m: any) => ({
                            title: m.title || m.text || '',
                            description: m.description || '',
                            differences: Array.isArray(m.differences) ? m.differences : [],
                        } as Mutation));

                    if (validMutations.length > 0) {
                        Logger.debug('Strategy 2 succeeded: extracted valid JSON array');
                        return validMutations;
                    }
                }
            }
        } catch (error) {
            Logger.warn('Strategy 2 failed:', error instanceof Error ? error.message : String(error));
        }

        // Strategy 3: Fallback extraction (existing logic)
        try {
            Logger.debug('Raw response (first 500 chars):', response.substring(0, 500));

            // Fallback: Try to extract individual mutation objects from the response
            try {
                const mutationObjects: Mutation[] = [];
                let i = 0;

                // Find all potential JSON objects by looking for opening braces
                while (i < response.length) {
                    if (response[i] === '{') {
                        // Try to extract a complete object starting from this position
                        let braceCount = 0;
                        let inString = false;
                        let escapeNext = false;
                        let start = i;
                        let end = i;

                        for (let j = i; j < response.length; j++) {
                            const char = response[j];

                            if (escapeNext) {
                                escapeNext = false;
                                continue;
                            }

                            if (char === '\\') {
                                escapeNext = true;
                                continue;
                            }

                            if (char === '"' && !escapeNext) {
                                inString = !inString;
                                continue;
                            }

                            if (inString) {
                                continue;
                            }

                            if (char === '{') {
                                braceCount++;
                            } else if (char === '}') {
                                braceCount--;
                                if (braceCount === 0) {
                                    end = j + 1;
                                    break;
                                }
                            }
                        }

                        if (braceCount === 0 && end > start) {
                            // Found a complete object, try to parse it
                            const objStr = response.substring(start, end);
                            try {
                                const repaired = extractAndRepairJSON(objStr, false);
                                const obj = JSON.parse(repaired);
                                // Validate it looks like a mutation object
                                if (obj && typeof obj === 'object' && (obj.text || obj.title || obj.description)) {
                                    mutationObjects.push({
                                        title: obj.title || obj.text || '',
                                        description: obj.description || '',
                                        differences: Array.isArray(obj.differences) ? obj.differences : [],
                                    } as Mutation);
                                }
                            } catch (e) {
                                // Skip invalid objects
                            }
                            i = end;
                        } else if (braceCount > 0 && end === start) {
                            // Incomplete object at the end - try to repair it
                            const objStr = response.substring(start);
                            try {
                                const repaired = extractAndRepairJSON(objStr, false);
                                const obj = JSON.parse(repaired);
                                // Validate it looks like a mutation object
                                if (obj && typeof obj === 'object' && (obj.text || obj.title || obj.description)) {
                                    mutationObjects.push({
                                        title: obj.title || obj.text || '',
                                        description: obj.description || '',
                                        differences: Array.isArray(obj.differences) ? obj.differences : [],
                                    } as Mutation);
                                }
                            } catch (e) {
                                // Skip invalid objects
                            }
                            break; // Reached end of response
                        } else {
                            i++;
                        }
                    } else {
                        i++;
                    }
                }

                if (mutationObjects.length > 0) {
                    Logger.debug(`Extracted ${mutationObjects.length} mutations from malformed JSON`);
                    return mutationObjects;
                }
            } catch (fallbackError) {
                Logger.warn('Strategy 3 (fallback extraction) also failed:', fallbackError);
            }
        } catch (error) {
            Logger.warn('Strategy 3 failed:', error instanceof Error ? error.message : String(error));
        }

        // Strategy 4: Try to extract individual objects and build array manually
        try {
            // Look for all JSON objects in the response
            const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            const matches = response.match(objectPattern);
            if (matches && matches.length > 0) {
                const mutationObjects: Mutation[] = [];
                for (const match of matches) {
                    try {
                        const repaired = extractAndRepairJSON(match, false);
                        const obj = JSON.parse(repaired);
                        if (obj && typeof obj === 'object' && (obj.text || obj.title || obj.description)) {
                            mutationObjects.push({
                                title: obj.title || obj.text || '',
                                description: obj.description || '',
                                differences: Array.isArray(obj.differences) ? obj.differences : [],
                            } as Mutation);
                        }
                    } catch (e) {
                        // Skip invalid objects
                    }
                }
                if (mutationObjects.length > 0) {
                    Logger.debug(`Strategy 4 succeeded: extracted ${mutationObjects.length} mutations from individual objects`);
                    return mutationObjects;
                }
            }
        } catch (error) {
            Logger.warn('Strategy 4 failed:', error instanceof Error ? error.message : String(error));
        }

        // All strategies failed - log detailed error information
        console.error('All parsing strategies failed. Response length:', response.length);
        const responsePreview = response.substring(0, 1000);
        console.error('Response preview (first 1000 chars):', responsePreview);
        try {
            const repaired = extractAndRepairJSON(response, true);
            console.error('Repaired JSON attempt (first 500 chars):', repaired.substring(0, 500));
        } catch (repairError) {
            console.error('Could not repair JSON:', repairError);
        }

        // Create a more informative error message
        const errorMessage = response.length === 0
            ? 'LLM returned an empty response. The model may have stopped generating or encountered an error.'
            : `Failed to parse mutations from LLM response: ${parseError?.message || 'Unknown error'}. The response may be malformed or incomplete.`;

        const error = new Error(errorMessage) as Error & { responseLength?: number; responsePreview?: string };
        error.responseLength = response.length;
        error.responsePreview = responsePreview;
        throw error;
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

