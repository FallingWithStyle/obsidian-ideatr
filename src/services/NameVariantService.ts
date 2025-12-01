import type { INameVariantService, NameVariant, NameVariantType } from '../types/transformation';
import type { ILLMService } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { NameVariantCache } from './NameVariantCache';
import { formatVariantsForMarkdown } from './VariantFormatter';
import { extractIdeaNameRuleBased, extractIdeaNameWithLLM } from '../utils/ideaNameExtractor';
import { extractAndRepairJSON } from '../utils/jsonRepair';

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
    private loadCacheData?: () => Promise<Record<string, any>>;
    private saveCacheData?: (data: Record<string, any>) => Promise<void>;

    constructor(
        llmService: ILLMService,
        settings: IdeatrSettings,
        loadCacheData?: () => Promise<Record<string, any>>,
        saveCacheData?: (data: Record<string, any>) => Promise<void>
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
                console.warn('Failed to load variant cache:', err);
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
                this.cache.loadFromData(data);
            }
        } catch (error) {
            console.warn('Failed to load variant cache:', error);
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
            console.warn('Failed to save variant cache:', error);
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
            console.warn('Failed to save cache after clear:', err);
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
                        this.saveCache().catch(err => console.warn('Cache save failed:', err));
                    }
                    return variants;
                }
            } catch (error) {
                console.warn('LLM variant generation failed, using fallback:', error);
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
            this.saveCache().catch(err => console.warn('Cache save failed:', err));
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
                console.warn('LLM completion failed, using fallback:', error);
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
                .filter((v: any) => v.text && v.type)
                .map((v: any) => ({
                    text: String(v.text).trim(),
                    type: this.validateVariantType(v.type),
                    quality: this.calculateVariantQuality(String(v.text).trim(), this.validateVariantType(v.type))
                }))
                .slice(0, this.settings.maxVariants || 10);
        } catch (error) {
            console.warn('Failed to parse variant response:', content, error);
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
        return `Generate creative name variants for: "${ideaName}"

Generate 8-12 high-quality, brandable name variants. Each variant should be:
- Memorable and easy to pronounce
- Distinct from others
- Creative, not generic

Variant types:
1. synonym - Words capturing the idea's essence (e.g., "notification" → "alert", "signal")
2. short - Concise names, 2-8 chars (e.g., "notification" → "Notify", "Alertly")
3. domain-hack - TLD completes the word (e.g., "notif.io", "read.it", "measur.app")
4. phonetic - Similar sound, different spelling (e.g., "notify" → "Notifai", "Notifi")
5. portmanteau - Blend two words (e.g., "net" + "flicks" → "Netflix")
6. made-up - Invented, pronounceable words (e.g., "Zapier", "Slack")

Rules:
- Domain hacks: TLD must complete the word naturally, not just appended
- Short names: Must be meaningful, not random letters
- All variants: Should feel brandable and professional

Output format (JSON only, no markdown):
{
  "variants": [
    { "text": "ExampleName1", "type": "synonym" },
    { "text": "ShortName", "type": "short" },
    { "text": "clever.io", "type": "domain-hack" }
  ]
}

Response:
{`;
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
        const words = ideaName.split(/\s+/).filter(w => w.length > 0);
        const cleanName = ideaName.replace(/\s+/g, '').toLowerCase();
        
        // Short version - first word or first 5 chars
        if (words.length > 0) {
            const firstWord = words[0];
            if (firstWord.length > 5) {
                variants.push({ text: firstWord.substring(0, 5), type: 'short' });
            } else {
                variants.push({ text: firstWord, type: 'short' });
            }
        }
        
        // Domain hacks
        if (cleanName.length > 0) {
            variants.push({ text: `${cleanName}.io`, type: 'domain-hack' });
            variants.push({ text: `${cleanName}.app`, type: 'domain-hack' });
            variants.push({ text: `${cleanName}.dev`, type: 'domain-hack' });
        }
        
        // Basic short version from clean name
        if (cleanName.length > 5) {
            variants.push({ text: cleanName.substring(0, 5), type: 'short' });
        }
        
        // Acronym if multiple words
        if (words.length > 1) {
            const acronym = words.map(w => w[0]?.toUpperCase() || '').join('');
            if (acronym.length >= 2) {
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

