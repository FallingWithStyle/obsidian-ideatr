import type { INameVariantService, NameVariant, NameVariantType } from '../types/transformation';
import type { ILLMService } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { NameVariantCache } from './NameVariantCache';
import { formatVariantsForMarkdown } from './VariantFormatter';
import { extractIdeaNameRuleBased, extractIdeaNameWithLLM } from '../utils/ideaNameExtractor';
import { extractAndRepairJSON } from '../utils/jsonRepair';
import { Logger } from '../utils/logger';

/**
 * Extract idea name from idea text
 * Uses LLM-based extraction if available and enabled, otherwise falls back to rule-based
 */
export async function extractIdeaName(
    ideaText: string,
    llmService?: ILLMService,
    useLLM: boolean = false
): Promise<string> {
    if (!ideaText || ideaText.trim().length === 0) {
        return '';
    }

    // Use LLM extraction if enabled and service is available
    if (useLLM && llmService) {
        return await extractIdeaNameWithLLM(ideaText, llmService);
    }

    // Fallback to rule-based extraction
    return extractIdeaNameRuleBased(ideaText);
}

/**
 * Synchronous version for backward compatibility
 * Uses rule-based extraction only
 */
export function extractIdeaNameSync(ideaText: string): string {
    return extractIdeaNameRuleBased(ideaText);
}

/**
 * NameVariantService - Generates name variants using LLM or fallback rules
 */
export class NameVariantService implements INameVariantService {
    private llmService: ILLMService;
    private settings: IdeatrSettings;
    private cache: NameVariantCache;
    private loadCacheData?: () => Promise<Record<string, unknown>>;
    private saveCacheData?: (data: Record<string, unknown>) => Promise<void>;

    constructor(
        llmService: ILLMService,
        settings: IdeatrSettings,
        loadCacheData?: () => Promise<Record<string, unknown>>,
        saveCacheData?: (data: Record<string, unknown>) => Promise<void>
    ) {
        this.llmService = llmService;
        this.settings = settings;
        this.cache = new NameVariantCache(
            24 * 60 * 60 * 1000, // 24 hour TTL
            settings.variantCacheMaxSize || 0
        );
        this.loadCacheData = loadCacheData;
        this.saveCacheData = saveCacheData;

        // Load cache from disk if persistence is enabled
        if (settings.variantCachePersist && loadCacheData) {
            this.loadCache().catch(err => {
                Logger.warn('Failed to load variant cache:', err);
            });
        }
    }

    /**
     * Load cache from persistent storage
     */
    async loadCache(): Promise<void> {
        if (!this.loadCacheData) return;

        try {
            const data = await this.loadCacheData();
            if (data && typeof data === 'object') {
                this.cache.loadFromData(data as Record<string, any>);
            }
        } catch (error) {
            Logger.warn('Failed to load variant cache:', error);
        }
    }

    /**
     * Save cache to persistent storage
     */
    async saveCache(): Promise<void> {
        if (!this.settings.variantCachePersist || !this.saveCacheData) return;

        try {
            const data = this.cache.toData();
            await this.saveCacheData(data);
        } catch (error) {
            Logger.warn('Failed to save variant cache:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStatistics() {
        return this.cache.getStatistics();
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.saveCache().catch(err => {
            Logger.warn('Failed to save cache after clear:', err);
        });
    }

    async generateVariants(ideaText: string, ideaName?: string): Promise<NameVariant[]> {
        // Extract name if not provided, using LLM if available
        const name = ideaName || await extractIdeaName(
            ideaText,
            this.llmService,
            this.settings.useLLMForNameExtraction || false
        );

        if (!name || name.trim().length === 0) {
            return [];
        }

        // Check cache first
        const cached = this.cache.get(name);
        if (cached) {
            return cached;
        }

        // Try LLM generation first if available
        if (this.llmService.isAvailable()) {
            try {
                const variants = await this.generateVariantsWithLLM(name);
                if (variants.length > 0) {
                    // Calculate average quality score for LLM variants (higher quality)
                    const avgQuality = this.calculateAverageQuality(variants);
                    // Cache the results with quality score
                    this.cache.set(name, variants, avgQuality);
                    // Save cache if persistence enabled
                    if (this.settings.variantCachePersist) {
                        this.saveCache().catch(err => Logger.warn('Cache save failed:', err));
                    }
                    return variants;
                }
            } catch (error) {
                Logger.warn('LLM variant generation failed, using fallback:', error);
            }
        }

        // Fallback to rule-based generation
        const fallbackVariants = this.generateFallbackVariants(name);
        // Calculate average quality for fallback variants (lower quality)
        const avgQuality = this.calculateAverageQuality(fallbackVariants, false);
        // Cache fallback results too (they're still useful)
        this.cache.set(name, fallbackVariants, avgQuality);
        // Save cache if persistence enabled
        if (this.settings.variantCachePersist) {
            this.saveCache().catch(err => Logger.warn('Cache save failed:', err));
        }
        return fallbackVariants;
    }

    isAvailable(): boolean {
        return true; // Service is always available (has fallback)
    }

    /**
     * Generate variants using LLM
     */
    private async generateVariantsWithLLM(ideaName: string): Promise<NameVariant[]> {
        const prompt = this.constructPrompt(ideaName);

        // Check if LlamaService has a complete method (for generic completions)
        if (this.llmService.complete && typeof this.llmService.complete === 'function') {
            try {
                const response = await this.llmService.complete(prompt, {
                    temperature: 0.8, // Higher creativity for better variants
                    n_predict: 512, // Increased for more variants (8-12)
                    stop: ['}']
                });

                const variants = this.parseVariantResponse(response);
                if (variants.length > 0) {
                    return variants;
                }
            } catch (error) {
                Logger.warn('LLM completion failed, using fallback:', error);
                // Fall through to fallback generation
            }
        }

        // Fallback if complete method not available or failed
        return [];
    }

    /**
     * Parse LLM response into NameVariant array
     */
    private parseVariantResponse(content: string): NameVariant[] {
        try {
            // Extract and repair JSON from response
            const repaired = extractAndRepairJSON(content, false);
            const parsed = JSON.parse(repaired);

            if (!parsed.variants || !Array.isArray(parsed.variants)) {
                return [];
            }

            return parsed.variants
                .filter((v: unknown): v is { text: unknown; type: unknown } => 
                    typeof v === 'object' && v !== null && 'text' in v && 'type' in v
                )
                .map((v: { text: unknown; type: unknown }) => ({
                    text: String(v.text || '').trim(),
                    type: this.validateVariantType(String(v.type || '')),
                    quality: this.calculateVariantQuality(String(v.text || '').trim(), this.validateVariantType(String(v.type || '')))
                }))
                .slice(0, this.settings.maxVariants || 10);
        } catch (error) {
            Logger.warn('Failed to parse variant response:', content, error);
            return [];
        }
    }

    /**
     * Validate variant type
     */
    private validateVariantType(type: string): NameVariantType {
        const validTypes: NameVariantType[] = ['synonym', 'short', 'domain-hack', 'phonetic', 'portmanteau', 'made-up'];
        return validTypes.includes(type as NameVariantType) ? (type as NameVariantType) : 'made-up';
    }

    /**
     * Construct prompt for LLM variant generation
     */
    private constructPrompt(ideaName: string): string {
        return `Generate creative, brandable name variants for: "${ideaName}"

CRITICAL REQUIREMENTS:
- Extract the CORE CONCEPT, not just use the literal text
- Focus on what makes the idea unique and memorable
- Generate names that could actually be used as product/brand names
- Prioritize creativity and memorability over literal translation

Generate 8-12 high-quality, brandable name variants. Each variant must be:
- Memorable and easy to pronounce (test: can you say it out loud naturally?)
- Distinct and creative (avoid generic words like "AI", "App", "Tool")
- Brandable (could you see this as a real product name?)
- 2-15 characters for most variants (domain hacks can be slightly longer if clever)

Variant types (use diverse mix):
1. synonym - Words capturing the idea's essence (e.g., "puzzle game" → "Riddle", "Enigma")
2. short - Concise, punchy names 3-8 chars (e.g., "notification" → "Ping", "Buzz")
3. domain-hack - TLD completes word naturally, MUST be short and clever (e.g., "find.it", "read.ly", NOT "longphrase.io")
4. phonetic - Similar sound, different spelling (e.g., "notify" → "Notifai")
5. portmanteau - Blend two relevant words (e.g., "net" + "flicks" → "Netflix")
6. made-up - Invented but pronounceable words (e.g., "Zapier", "Slack", "Figma")

STRICT RULES:
- NEVER create unpronounceable acronyms (e.g., "AGPFOIM" is BAD)
- If using acronyms, they must be 6 chars or fewer AND pronounceable (e.g., "ACME", "NASA")
- Domain hacks: Must be SHORT (under 12 chars total) and clever, not just appending .io to long phrases
- Avoid overly generic terms (e.g., "AI", "App", "Tool" alone are too generic)
- Short names: Must be meaningful words or pronounceable invented words, not random letters
- Extract the essence: For "AI puzzle with monkeys like Where's Waldo" → focus on "puzzle", "find", "monkey", "hidden", not the full description

Examples:

Input: "notification app"
Output: {
  "variants": [
    {"text": "Alert", "type": "synonym"},
    {"text": "Ping", "type": "short"},
    {"text": "Buzz", "type": "short"},
    {"text": "notif.io", "type": "domain-hack"},
    {"text": "Notifai", "type": "phonetic"},
    {"text": "Alertify", "type": "made-up"},
    {"text": "Signal", "type": "synonym"},
    {"text": "Chime", "type": "short"}
  ]
}

Input: "AI generated puzzle full of interlinked monkeys that look similar, sort of a where's waldo of monkeys"
Output: {
  "variants": [
    {"text": "MonkeyFind", "type": "portmanteau"},
    {"text": "PrimateSeek", "type": "portmanteau"},
    {"text": "FindMonkey", "type": "portmanteau"},
    {"text": "WaldoMonkey", "type": "portmanteau"},
    {"text": "SpotTheApe", "type": "portmanteau"},
    {"text": "MonkeyHunt", "type": "portmanteau"},
    {"text": "PrimatePuzzle", "type": "portmanteau"},
    {"text": "ApeSpot", "type": "short"},
    {"text": "MonkeySee", "type": "portmanteau"},
    {"text": "find.ape", "type": "domain-hack"},
    {"text": "Spotly", "type": "made-up"},
    {"text": "Primate", "type": "synonym"}
  ]
}

Input: "meditation tracker"
Output: {
  "variants": [
    {"text": "Mindful", "type": "synonym"},
    {"text": "Zen", "type": "short"},
    {"text": "Breathe", "type": "synonym"},
    {"text": "Mindspace", "type": "portmanteau"},
    {"text": "Breathly", "type": "made-up"},
    {"text": "Calmly", "type": "made-up"},
    {"text": "Zenly", "type": "made-up"}
  ]
}

Input: "task manager"
Output: {
  "variants": [
    {"text": "Organize", "type": "synonym"},
    {"text": "Tasker", "type": "short"},
    {"text": "Doable", "type": "made-up"},
    {"text": "get.done", "type": "domain-hack"},
    {"text": "Taskly", "type": "phonetic"},
    {"text": "Tackle", "type": "synonym"},
    {"text": "Action", "type": "synonym"}
  ]
}

Input: "${ideaName}"
Output: {`;
    }

    /**
     * Format variants as markdown for file body
     */
    formatVariantsForMarkdown(variants: NameVariant[]): string {
        return formatVariantsForMarkdown(variants, this.settings.maxVariants || 10);
    }

    /**
     * Calculate quality score for a single variant (0-1)
     * Higher scores indicate better quality variants
     */
    private calculateVariantQuality(text: string, type: NameVariantType): number {
        let score = 0.5; // Base score

        // Length factor: optimal length is 3-15 characters
        if (text.length >= 3 && text.length <= 15) {
            score += 0.2;
        } else if (text.length > 15 && text.length <= 25) {
            score += 0.1;
        } else if (text.length < 3 || text.length > 30) {
            score -= 0.2;
        }

        // Type factor: some types are generally better
        const typeScores: Record<NameVariantType, number> = {
            'synonym': 0.15,
            'portmanteau': 0.15,
            'phonetic': 0.1,
            'short': 0.05,
            'domain-hack': 0.05,
            'made-up': 0.0
        };
        score += typeScores[type] || 0;

        // Readability factor: check for common patterns
        if (/^[a-z]+$/i.test(text)) {
            score += 0.1; // All letters, no numbers/special chars
        }
        if (text.split(/\s+/).length <= 2) {
            score += 0.05; // 1-2 words is better
        }

        // Clamp to 0-1 range
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Calculate average quality score for an array of variants
     */
    private calculateAverageQuality(variants: NameVariant[], isLLM: boolean = true): number {
        if (variants.length === 0) return 0;

        // Calculate individual quality scores if not present
        const scores = variants.map(v => {
            if (v.quality !== undefined) {
                return v.quality;
            }
            return this.calculateVariantQuality(v.text, v.type);
        });

        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;

        // LLM variants get a boost (they're generally better)
        return isLLM ? Math.min(1, avg + 0.1) : avg;
    }

    /**
     * Generate fallback variants using simple rule-based transformations
     */
    private generateFallbackVariants(ideaName: string): NameVariant[] {
        const variants: NameVariant[] = [];
        const words = ideaName.split(/\s+/).filter(w => w.length > 0 && w.length <= 15); // Filter out very long words
        const cleanName = ideaName.replace(/\s+/g, '').toLowerCase();

        // Extract meaningful words (skip common words like "the", "a", "an", "of", "for", "with")
        const meaningfulWords = words.filter(w => {
            const lower = w.toLowerCase();
            return !['the', 'a', 'an', 'of', 'for', 'with', 'that', 'this', 'is', 'are', 'was', 'were'].includes(lower);
        });

        // Use meaningful words if available, otherwise use all words
        const wordsToUse = meaningfulWords.length > 0 ? meaningfulWords : words;

        // Short version - first meaningful word (capitalized)
        if (wordsToUse.length > 0) {
            const firstWord = wordsToUse[0];
            // Only use if it's a reasonable length (3-12 chars)
            if (firstWord.length >= 3 && firstWord.length <= 12) {
                const capitalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
                variants.push({ text: capitalized, type: 'short' });
            }
        }

        // Domain hacks - only if the clean name is reasonably short (under 15 chars)
        if (cleanName.length > 0 && cleanName.length <= 12) {
            variants.push({ text: `${cleanName}.io`, type: 'domain-hack' });
            if (cleanName.length <= 10) {
                variants.push({ text: `${cleanName}.app`, type: 'domain-hack' });
            }
        }

        // Portmanteau from first two meaningful words (if both are short enough)
        if (wordsToUse.length >= 2) {
            const word1 = wordsToUse[0].toLowerCase();
            const word2 = wordsToUse[1].toLowerCase();
            if (word1.length <= 8 && word2.length <= 8) {
                // Combine first part of word1 with word2, or word1 with first part of word2
                const portmanteau1 = word1 + word2;
                const portmanteau2 = word1.substring(0, Math.min(4, word1.length)) + word2;
                if (portmanteau1.length <= 12) {
                    const capitalized = portmanteau1.charAt(0).toUpperCase() + portmanteau1.slice(1);
                    variants.push({ text: capitalized, type: 'portmanteau' });
                }
                if (portmanteau2.length <= 12 && portmanteau2 !== portmanteau1) {
                    const capitalized = portmanteau2.charAt(0).toUpperCase() + portmanteau2.slice(1);
                    variants.push({ text: capitalized, type: 'portmanteau' });
                }
            }
        }

        // Acronym only if 2-4 words and will be pronounceable (2-4 chars)
        if (wordsToUse.length >= 2 && wordsToUse.length <= 4) {
            const acronym = wordsToUse.map(w => w[0]?.toUpperCase() || '').join('');
            if (acronym.length >= 2 && acronym.length <= 4) {
                variants.push({ text: acronym, type: 'short' });
            }
        }

        // Add quality scores to fallback variants
        const variantsWithQuality = variants
            .map(v => ({
                ...v,
                quality: this.calculateVariantQuality(v.text, v.type)
            }))
            .slice(0, this.settings.maxVariants || 8);

        return variantsWithQuality;
    }
}

