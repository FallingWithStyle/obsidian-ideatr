import type { ILLMService } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { MODELS } from '../services/ModelManager';
import { LlamaService } from '../services/LlamaService';
import { HybridLLM } from '../services/HybridLLM';

/**
 * Connection status for the AI model
 */
export type ModelConnectionStatus = 'connected' | 'loading' | 'not-connected' | 'error';

/**
 * Model status information
 */
export interface ModelStatus {
    status: ModelConnectionStatus;
    modelName: string;
    provider: 'local' | 'cloud' | 'hybrid' | 'none';
    details?: string;
}

/**
 * Get the current model status from the LLM service
 */
export function getModelStatus(
    llmService: ILLMService | undefined,
    settings: IdeatrSettings
): ModelStatus {
    // If no service provided, return not-connected
    if (!llmService) {
        return {
            status: 'not-connected',
            modelName: 'No AI configured',
            provider: 'none',
            details: 'Please configure AI in settings'
        };
    }

    // Check if service is available
    if (!llmService.isAvailable()) {
        return {
            status: 'not-connected',
            modelName: 'AI not available',
            provider: 'none',
            details: 'AI service is not configured or enabled'
        };
    }

    // Handle HybridLLM (which wraps local and cloud)
    if (llmService instanceof HybridLLM) {
        const hybridLLM = llmService as HybridLLM;
        const preferCloud = settings.preferCloud;
        
        // Determine which provider to check
        if (preferCloud && settings.cloudProvider !== 'none' && settings.cloudApiKey.trim().length > 0) {
            // Prefer cloud - check cloud status
            const cloudStatus = getCloudProviderStatus(settings);
            if (cloudStatus.status === 'connected') {
                return cloudStatus;
            }
            // Fall back to local if cloud not available
        }
        
        // Check local status using public getter
        const localService = hybridLLM.getLocalLLM();
        if (localService instanceof LlamaService) {
            return getLocalModelStatus(localService, settings);
        }
        
        // Fallback: return basic status
        const modelKey = settings.localModel || 'phi-3.5-mini';
        const modelConfig = MODELS[modelKey];
        const modelName = modelConfig ? modelConfig.name : 'Unknown Model';
        return {
            status: 'loading',
            modelName,
            provider: 'hybrid',
            details: 'Checking status...'
        };
    }

    // Handle LlamaService (local)
    if (llmService instanceof LlamaService) {
        return getLocalModelStatus(llmService, settings);
    }

    // Handle cloud providers (ProviderAdapter)
    // Cloud providers are typically always ready if configured
    return getCloudProviderStatus(settings);
}

/**
 * Get status for local Llama model
 */
function getLocalModelStatus(
    llmService: ILLMService,
    settings: IdeatrSettings
): ModelStatus {
    const llamaService = llmService as LlamaService;
    
    // Get model name from ModelManager
    const modelKey = settings.localModel || 'phi-3.5-mini';
    const modelConfig = MODELS[modelKey];
    const modelName = modelConfig ? modelConfig.name : 'Unknown Model';

    // Check connection state using public getters
    const loadingState = llamaService.getLoadingState();
    const isServerReady = llamaService.getIsServerReady();
    const hasServerProcess = llamaService.hasServerProcess();

    // Determine status
    let status: ModelConnectionStatus;
    let details: string | undefined;

    if (loadingState === 'ready' && isServerReady) {
        status = 'connected';
        details = 'Model loaded and ready';
    } else if (loadingState === 'loading' || (hasServerProcess && !isServerReady)) {
        status = 'loading';
        details = 'Loading model...';
    } else if (loadingState === 'not-loaded' && !hasServerProcess) {
        status = 'not-connected';
        details = 'Model not loaded';
    } else {
        status = 'error';
        details = 'Connection issue';
    }

    return {
        status,
        modelName,
        provider: 'local',
        details
    };
}

/**
 * Get status for cloud provider
 */
function getCloudProviderStatus(settings: IdeatrSettings): ModelStatus {
    if (settings.cloudProvider === 'none' || settings.cloudApiKey.trim().length === 0) {
        return {
            status: 'not-connected',
            modelName: 'Cloud AI not configured',
            provider: 'cloud',
            details: 'Please configure cloud AI in settings'
        };
    }

    // Get provider name
    let providerName: string = settings.cloudProvider;
    if (settings.cloudProvider === 'openrouter' && settings.openRouterModel) {
        providerName = `OpenRouter: ${settings.openRouterModel}`;
    } else if (settings.cloudProvider === 'custom' && settings.customEndpointUrl) {
        providerName = `Custom: ${settings.customEndpointUrl}`;
    }

    // Cloud providers are typically always ready if configured
    return {
        status: 'connected',
        modelName: providerName.charAt(0).toUpperCase() + providerName.slice(1),
        provider: 'cloud',
        details: 'Cloud AI ready'
    };
}

/**
 * Create a status indicator element
 */
export function createModelStatusIndicator(
    llmService: ILLMService | undefined,
    settings: IdeatrSettings
): HTMLElement {
    const status = getModelStatus(llmService, settings);
    const container = document.createElement('div');
    container.className = 'ideatr-model-status-indicator';
    
    // Status dot
    const dot = document.createElement('div');
    dot.className = `ideatr-model-status-dot ideatr-model-status-${status.status}`;
    container.appendChild(dot);

    // Tooltip with model info
    const tooltip = document.createElement('div');
    tooltip.className = 'ideatr-model-status-tooltip';
    tooltip.textContent = `${status.modelName}${status.details ? ` - ${status.details}` : ''}`;
    container.appendChild(tooltip);

    // Tooltip is shown/hidden via CSS hover, but we can also add a title attribute for accessibility
    container.setAttribute('title', `${status.modelName}${status.details ? ` - ${status.details}` : ''}`);

    return container;
}

