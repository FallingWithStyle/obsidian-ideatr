/**
 * Model validation and recommendations for Ideatr
 * 
 * This utility provides validated model lists for each provider
 * to ensure compatibility with Ideatr's classification and tagging tasks.
 */

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    recommended: boolean; // Whether this is recommended for Ideatr's use case
    cost: 'low' | 'medium' | 'high';
    speed: 'fast' | 'medium' | 'slow';
    quality: 'good' | 'excellent' | 'premium';
    badge?: string; // Badge like "EFFICIENT", "BALANCED", "PREMIUM"
    pros?: string[]; // List of advantages
    cons?: string[]; // List of disadvantages
    bestFor?: string; // Target audience
    costEstimate?: string; // Cost estimate per idea (e.g., "~$0.002 per idea")
}

/**
 * Cloud model configuration (similar to local ModelConfig)
 */
export interface CloudModelConfig {
    key: string;
    name: string;
    badge: string;
    provider: 'anthropic' | 'openai' | 'gemini' | 'groq';
    modelId: string;
    description: string;
    quality: number; // 1-5 rating
    speed: number; // 1-5 rating
    cost: 'low' | 'medium' | 'high';
    costEstimate: string; // e.g., "~$0.002 per idea"
    pros: string[];
    cons: string[];
    bestFor: string;
}

export type ProviderType = 'anthropic' | 'openai' | 'gemini' | 'groq';

/**
 * Validated models for Anthropic
 */
export const ANTHROPIC_MODELS: ModelInfo[] = [
    {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast, cost-effective model ideal for classification tasks (default)',
        recommended: true,
        cost: 'low',
        speed: 'fast',
        quality: 'good'
    },
    {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Balanced performance with better reasoning and accuracy',
        recommended: true,
        cost: 'medium',
        speed: 'medium',
        quality: 'excellent'
    },
    {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Highest quality model for complex or nuanced classification',
        recommended: false,
        cost: 'high',
        speed: 'slow',
        quality: 'premium'
    },
    {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Previous generation balanced model (still available)',
        recommended: false,
        cost: 'medium',
        speed: 'medium',
        quality: 'excellent'
    },
    {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Previous generation fast model (still available)',
        recommended: false,
        cost: 'low',
        speed: 'fast',
        quality: 'good'
    }
];

/**
 * Validated models for OpenAI
 */
export const OPENAI_MODELS: ModelInfo[] = [
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast, cost-effective model ideal for classification tasks (default)',
        recommended: true,
        cost: 'low',
        speed: 'fast',
        quality: 'good'
    },
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'High-quality model with excellent reasoning capabilities',
        recommended: true,
        cost: 'medium',
        speed: 'medium',
        quality: 'excellent'
    },
    {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Previous generation high-quality model',
        recommended: false,
        cost: 'medium',
        speed: 'medium',
        quality: 'excellent'
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and affordable, good for simple classification',
        recommended: false,
        cost: 'low',
        speed: 'fast',
        quality: 'good'
    }
];

/**
 * Validated models for Google Gemini
 */
export const GEMINI_MODELS: ModelInfo[] = [
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast, cost-effective model ideal for classification tasks (default)',
        recommended: true,
        cost: 'low',
        speed: 'fast',
        quality: 'good'
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'High-quality model with better reasoning and accuracy',
        recommended: true,
        cost: 'medium',
        speed: 'medium',
        quality: 'excellent'
    },
    {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Previous generation balanced model (still available)',
        recommended: false,
        cost: 'medium',
        speed: 'medium',
        quality: 'good'
    }
];

/**
 * Validated models for Groq
 */
export const GROQ_MODELS: ModelInfo[] = [
    {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        description: 'High-quality model with excellent reasoning (default)',
        recommended: true,
        cost: 'low',
        speed: 'fast',
        quality: 'excellent'
    },
    {
        id: 'llama-3.1-70b-versatile',
        name: 'Llama 3.1 70B Versatile',
        description: 'Previous generation high-quality model',
        recommended: false,
        cost: 'low',
        speed: 'fast',
        quality: 'excellent'
    },
    {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        description: 'Faster, lighter model for simple tasks',
        recommended: false,
        cost: 'low',
        speed: 'fast',
        quality: 'good'
    },
    {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        description: 'High-quality mixture-of-experts model',
        recommended: true,
        cost: 'low',
        speed: 'fast',
        quality: 'excellent'
    }
];

/**
 * Get all validated models for a provider
 */
export function getModelsForProvider(provider: ProviderType): ModelInfo[] {
    switch (provider) {
        case 'anthropic':
            return ANTHROPIC_MODELS;
        case 'openai':
            return OPENAI_MODELS;
        case 'gemini':
            return GEMINI_MODELS;
        case 'groq':
            return GROQ_MODELS;
        default:
            return [];
    }
}

/**
 * Get recommended models for a provider
 */
export function getRecommendedModels(provider: ProviderType): ModelInfo[] {
    return getModelsForProvider(provider).filter(m => m.recommended);
}

/**
 * Validate if a model ID is valid for a provider
 */
export function isValidModel(provider: ProviderType, modelId: string): boolean {
    const models = getModelsForProvider(provider);
    return models.some(m => m.id === modelId);
}

/**
 * Get model info for a specific model ID
 */
export function getModelInfo(provider: ProviderType, modelId: string): ModelInfo | undefined {
    const models = getModelsForProvider(provider);
    return models.find(m => m.id === modelId);
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: ProviderType): string {
    const recommended = getRecommendedModels(provider);
    // Return the first recommended model (usually the fastest/cheapest)
    return recommended.length > 0 ? recommended[0].id : '';
}

/**
 * Cloud model configurations for comparison (similar to local MODELS)
 * Organized by provider and tier
 */
export const CLOUD_MODELS: Record<string, CloudModelConfig> = {
    // Anthropic Models
    'anthropic-haiku': {
        key: 'anthropic-haiku',
        name: 'Claude 3.5 Haiku',
        badge: 'EFFICIENT',
        provider: 'anthropic',
        modelId: 'claude-3-5-haiku-20241022',
        description: 'Fast, cost-effective model ideal for classification tasks. Excellent at structured work like categorization and tagging.',
        quality: 4,
        speed: 5,
        cost: 'low',
        costEstimate: '~$0.002 per idea',
        pros: ['Fast', 'Cost-effective', 'Good accuracy', 'Low latency'],
        cons: ['Less nuanced than larger models'],
        bestFor: 'Most users'
    },
    'anthropic-sonnet': {
        key: 'anthropic-sonnet',
        name: 'Claude 3.5 Sonnet',
        badge: 'BALANCED',
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
        description: 'Balanced performance with better reasoning and accuracy. Great for complex or nuanced classification tasks.',
        quality: 4.5,
        speed: 4,
        cost: 'medium',
        costEstimate: '~$0.015 per idea',
        pros: ['Better reasoning', 'Higher accuracy', 'Handles complexity well'],
        cons: ['More expensive', 'Slightly slower'],
        bestFor: 'Users who want better quality'
    },
    'anthropic-opus': {
        key: 'anthropic-opus',
        name: 'Claude 3 Opus',
        badge: 'PREMIUM',
        provider: 'anthropic',
        modelId: 'claude-3-opus-20240229',
        description: 'Highest quality model for complex or nuanced classification. Best for edge cases and ambiguous ideas.',
        quality: 5,
        speed: 2,
        cost: 'high',
        costEstimate: '~$0.15 per idea',
        pros: ['Best quality', 'Excellent reasoning', 'Handles edge cases'],
        cons: ['Expensive', 'Slower', 'Overkill for simple tasks'],
        bestFor: 'Power users with complex ideas'
    },

    // OpenAI Models
    'openai-mini': {
        key: 'openai-mini',
        name: 'GPT-4o Mini',
        badge: 'EFFICIENT',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        description: 'Fast, cost-effective model ideal for classification tasks. Excellent at structured work like categorization and tagging.',
        quality: 4,
        speed: 5,
        cost: 'low',
        costEstimate: '~$0.001 per idea',
        pros: ['Very fast', 'Most cost-effective', 'Good accuracy', 'Low latency'],
        cons: ['Less nuanced than GPT-4o'],
        bestFor: 'Most users'
    },
    'openai-4o': {
        key: 'openai-4o',
        name: 'GPT-4o',
        badge: 'BALANCED',
        provider: 'openai',
        modelId: 'gpt-4o',
        description: 'High-quality model with excellent reasoning capabilities. Great for complex or nuanced classification tasks.',
        quality: 4.5,
        speed: 4,
        cost: 'medium',
        costEstimate: '~$0.01 per idea',
        pros: ['Better reasoning', 'Higher accuracy', 'Handles complexity well'],
        cons: ['More expensive', 'Slightly slower'],
        bestFor: 'Users who want better quality'
    },

    // Gemini Models
    'gemini-flash': {
        key: 'gemini-flash',
        name: 'Gemini 1.5 Flash',
        badge: 'EFFICIENT',
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        description: 'Fast, cost-effective model ideal for classification tasks. Excellent at structured work like categorization and tagging.',
        quality: 4,
        speed: 5,
        cost: 'low',
        costEstimate: '~$0.0005 per idea',
        pros: ['Very fast', 'Most cost-effective', 'Good accuracy', 'Low latency'],
        cons: ['Less nuanced than Pro'],
        bestFor: 'Most users'
    },
    'gemini-pro': {
        key: 'gemini-pro',
        name: 'Gemini 1.5 Pro',
        badge: 'BALANCED',
        provider: 'gemini',
        modelId: 'gemini-1.5-pro',
        description: 'High-quality model with better reasoning and accuracy. Great for complex or nuanced classification tasks.',
        quality: 4.5,
        speed: 4,
        cost: 'medium',
        costEstimate: '~$0.005 per idea',
        pros: ['Better reasoning', 'Higher accuracy', 'Handles complexity well'],
        cons: ['More expensive', 'Slightly slower'],
        bestFor: 'Users who want better quality'
    },

    // Groq Models
    'groq-llama-70b': {
        key: 'groq-llama-70b',
        name: 'Llama 3.3 70B Versatile',
        badge: 'BALANCED',
        provider: 'groq',
        modelId: 'llama-3.3-70b-versatile',
        description: 'High-quality model with excellent reasoning. Fast inference via Groq\'s infrastructure.',
        quality: 4.5,
        speed: 5,
        cost: 'low',
        costEstimate: 'Free (via Groq)',
        pros: ['Free', 'Very fast', 'High quality', 'Excellent reasoning'],
        cons: ['Requires Groq API key'],
        bestFor: 'Users who want free high-quality AI'
    },
    'groq-mixtral': {
        key: 'groq-mixtral',
        name: 'Mixtral 8x7B',
        badge: 'VERSATILE',
        provider: 'groq',
        modelId: 'mixtral-8x7b-32768',
        description: 'High-quality mixture-of-experts model. Fast inference via Groq\'s infrastructure.',
        quality: 4.5,
        speed: 5,
        cost: 'low',
        costEstimate: 'Free (via Groq)',
        pros: ['Free', 'Very fast', 'High quality', 'Mixture-of-experts'],
        cons: ['Requires Groq API key'],
        bestFor: 'Users who want free high-quality AI'
    }
};

/**
 * Get all cloud models for comparison
 */
export function getAllCloudModels(): CloudModelConfig[] {
    return Object.values(CLOUD_MODELS);
}

/**
 * Get cloud models by provider
 */
export function getCloudModelsByProvider(provider: ProviderType): CloudModelConfig[] {
    return Object.values(CLOUD_MODELS).filter(m => m.provider === provider);
}

/**
 * Get cloud model by key
 */
export function getCloudModel(key: string): CloudModelConfig | undefined {
    return CLOUD_MODELS[key];
}

