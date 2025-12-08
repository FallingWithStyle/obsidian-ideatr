/**
 * ModelManager stub for MVP version
 * Local AI model management has been simplified/removed in MVP
 * This stub exists only to satisfy TypeScript compilation
 */

export interface ModelConfig {
    name: string;
    badge: string;
    description: string;
    sizeMB: number;
    ram?: string;
    quality: number;
    speed: number;
}

export const MODELS: Record<string, ModelConfig> = {
    'phi-3.5-mini': {
        name: 'Phi-3.5 Mini',
        badge: 'EFFICIENT',
        description: 'Lightweight model for quick responses',
        sizeMB: 4200,
        ram: '6-8GB',
        quality: 4,
        speed: 5
    },
    'qwen-2.5-7b': {
        name: 'Qwen 2.5 7B',
        badge: 'VERSATILE',
        description: 'Versatile model with better quality',
        sizeMB: 7800,
        ram: '10GB',
        quality: 4.5,
        speed: 4
    },
    'llama-3.1-8b': {
        name: 'Llama 3.1 8B',
        badge: 'RELIABLE',
        description: 'Reliable model with strong performance',
        sizeMB: 8500,
        ram: '10-12GB',
        quality: 4.5,
        speed: 3
    },
    'llama-3.3-70b': {
        name: 'Llama 3.3 70B',
        badge: 'MAXIMUM',
        description: 'Maximum quality for powerful hardware',
        sizeMB: 42500,
        ram: '48GB+',
        quality: 5,
        speed: 1
    }
};

/**
 * Interface for ModelManager
 */
export interface IModelManager {
    getModelConfig(): ModelConfig;
    getModelInfo(): { name: string; sizeMB: number };
    getModelPath(): string;
    isModelDownloaded(): Promise<boolean>;
    verifyModelIntegrity(): Promise<boolean>;
    downloadModel(onProgress: (progress: number, downloadedMB: number, totalMB: number) => void, onError?: (error: Error) => void, overwrite?: boolean): Promise<void>;
    cancelDownload(): void;
    deleteModel?(): Promise<void>;
}

/**
 * Stub ModelManager class for MVP
 * Returns null/false for all operations since local model management is not active in MVP
 */
export class ModelManager implements IModelManager {
    private modelKey: string;

    constructor(modelKey?: string) {
        this.modelKey = modelKey || 'phi-3.5-mini';
    }

    getModelConfig(): ModelConfig {
        return MODELS[this.modelKey] || MODELS['phi-3.5-mini'];
    }

    getModelInfo(): { name: string; sizeMB: number } {
        const config = this.getModelConfig();
        return {
            name: config.name,
            sizeMB: config.sizeMB
        };
    }

    getModelPath(): string {
        return '';
    }

    async isModelDownloaded(): Promise<boolean> {
        return false;
    }

    async verifyModelIntegrity(): Promise<boolean> {
        return false;
    }

    async downloadModel(_onProgress: (progress: number, downloadedMB: number, totalMB: number) => void, _onError?: (error: Error) => void, _overwrite?: boolean): Promise<void> {
        throw new Error('Model downloads are not available in MVP version');
    }

    cancelDownload(): void {
        // Stub - no-op
    }

    async deleteModel(): Promise<void> {
        throw new Error('Model management is not available in MVP version');
    }
}
