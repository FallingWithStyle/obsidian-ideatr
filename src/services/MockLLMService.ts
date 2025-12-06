import type { ILLMService, ClassificationResult, IdeaCategory } from '../types/classification';

/**
 * Mock LLM Service for testing
 * Provides deterministic classification based on keyword matching
 */
export class MockLLMService implements ILLMService {
    private readonly categoryKeywords: Record<string, string[]> = {
        'game': ['game', 'roguelike', 'dungeon', 'rpg', 'puzzle', 'platformer', 'shooter'],
        'saas': ['saas', 'web app', 'platform', 'service', 'subscription', 'cloud', 'collaboration'],
        'tool': ['tool', 'utility', 'cli', 'library', 'framework', 'plugin', 'extension'],
        'story': ['story', 'narrative', 'novel', 'fiction', 'tale', 'plot', 'character'],
        'mechanic': ['mechanic', 'gameplay', 'system', 'rule', 'interaction'],
        'hardware': ['hardware', 'device', 'iot', 'smart', 'sensor', 'physical'],
        'ip': ['ip', 'world', 'universe', 'franchise', 'brand'],
        'brand': ['brand', 'logo', 'identity', 'marketing'],
        'ux': ['ux', 'ui', 'interface', 'design', 'user experience'],
        'personal': ['personal', 'habit', 'routine', 'self', 'life']
    };

    private readonly commonTags: Record<string, string[]> = {
        'productivity': ['productivity', 'efficient', 'workflow', 'organize', 'manage'],
        'developer': ['developer', 'programming', 'code', 'software'],
        'mobile': ['mobile', 'app', 'ios', 'android'],
        'fitness': ['fitness', 'health', 'exercise', 'workout'],
        'education': ['education', 'learning', 'teaching', 'course'],
        'social': ['social', 'community', 'network', 'sharing'],
        'automation': ['automation', 'automatic', 'automate'],
        'ai': ['ai', 'machine learning', 'artificial intelligence'],
    };

    // Note: This method is async to satisfy the ILLMService interface,
    // even though it doesn't contain any await expressions
    async classify(text: string): Promise<ClassificationResult> {
        if (!text || text.trim().length === 0) {
            return {
                category: '',
                tags: [],
                confidence: 0
            };
        }

        const lowerText = text.toLowerCase();

        // Determine category
        const category = this.determineCategory(lowerText);

        // Generate tags
        const tags = this.generateTags(lowerText);

        // Calculate confidence (mock: based on keyword matches)
        const confidence = this.calculateConfidence(lowerText, category, tags);

        return {
            category,
            tags,
            confidence
        };
    }

    isAvailable(): boolean {
        return true;
    }

    private determineCategory(text: string): IdeaCategory {
        let bestMatch: IdeaCategory = '';
        let maxScore = 0;

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            const score = keywords.filter(keyword => text.includes(keyword)).length;
            if (score > maxScore) {
                maxScore = score;
                bestMatch = category as IdeaCategory;
            }
        }

        return bestMatch;
    }

    private generateTags(text: string): string[] {
        const tags: string[] = [];

        for (const [tag, keywords] of Object.entries(this.commonTags)) {
            const matches = keywords.filter(keyword => text.includes(keyword)).length;
            if (matches > 0) {
                tags.push(tag);
            }
        }

        // Extract key words from text as additional tags
        const words = text.split(/\s+/).filter(word => word.length > 4);
        const additionalTags = words.slice(0, 2).map(word =>
            word.toLowerCase().replace(/[^a-z]/g, '')
        ).filter(word => word.length > 0);

        tags.push(...additionalTags);

        // Return 3-5 tags
        const uniqueTags = [...new Set(tags)];
        return uniqueTags.slice(0, 5).length >= 3
            ? uniqueTags.slice(0, 5)
            : uniqueTags.concat(['general']).slice(0, 3);
    }

    private calculateConfidence(text: string, category: IdeaCategory, tags: string[]): number {
        if (!category || tags.length === 0) {
            return 0.3;
        }

        const categoryKeywords = this.categoryKeywords[category] || [];
        const categoryMatches = categoryKeywords.filter(keyword => text.includes(keyword)).length;

        // Confidence based on keyword matches
        const confidence = Math.min(0.5 + (categoryMatches * 0.1) + (tags.length * 0.05), 0.95);

        return Math.round(confidence * 100) / 100;
    }
}
