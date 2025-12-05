import type { App } from 'obsidian';
import type { ILLMService } from '../types/classification';
import type { IdeatrSettings } from '../settings';
import { createStatusIcon } from './iconUtils';

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

    // Handle cloud providers (ProviderAdapter)
    // Cloud providers are typically always ready if configured
    return getCloudProviderStatus(settings);
}

/**
 * Get status for cloud provider
 */
function getCloudProviderStatus(settings: IdeatrSettings): ModelStatus {
    // Check if provider is configured
    if (settings.cloudProvider === 'none') {
        return {
            status: 'not-connected',
            modelName: 'Cloud AI not configured',
            provider: 'cloud',
            details: 'Please configure cloud AI in settings'
        };
    }
    
    // Check if API key exists for the provider (or endpoint URL for custom)
    const hasApiKey = settings.cloudProvider === 'custom'
        ? (settings.customEndpointUrl && settings.customEndpointUrl.trim().length > 0)
        : settings.cloudProvider === 'custom-model'
        ? (settings.customModelProvider && settings.cloudApiKeys && 
            settings.customModelProvider in settings.cloudApiKeys &&
            (settings.cloudApiKeys[settings.customModelProvider as keyof typeof settings.cloudApiKeys] || '').trim().length > 0)
        : (settings.cloudApiKeys && 
            settings.cloudProvider in settings.cloudApiKeys &&
            (settings.cloudApiKeys[settings.cloudProvider as keyof typeof settings.cloudApiKeys] || '').trim().length > 0);
    
    if (!hasApiKey) {
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
    } else if (settings.cloudProvider === 'custom-model' && settings.customModelProvider && settings.customModel) {
        providerName = `${settings.customModelProvider}: ${settings.customModel}`;
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
 * @param llmService - The LLM service to check status for
 * @param settings - Plugin settings
 * @param _app - Optional Obsidian App instance (for potential future use with Obsidian's icon system)
 */
export function createModelStatusIndicator(
    llmService: ILLMService | undefined,
    settings: IdeatrSettings,
    _app?: App
): HTMLElement {
    const status = getModelStatus(llmService, settings);
    const container = document.createElement('div');
    container.className = 'ideatr-model-status-indicator';
    
    // Status icon with appropriate color based on connection status
    const iconEl = createStatusIcon(status.status, `ideatr-model-status-icon ideatr-model-status-${status.status}`);
    container.appendChild(iconEl);

    // Tooltip with model info
    const tooltip = document.createElement('div');
    tooltip.className = 'ideatr-model-status-tooltip';
    tooltip.textContent = `${status.modelName}${status.details ? ` - ${status.details}` : ''}`;
    container.appendChild(tooltip);

    // Tooltip is shown/hidden via CSS hover, but we can also add a title attribute for accessibility
    container.setAttribute('title', `${status.modelName}${status.details ? ` - ${status.details}` : ''}`);

    return container;
}

