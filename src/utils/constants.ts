/**
 * Centralized constants for Obsidian Ideatr
 */

export const LLM_CONSTANTS = {
    // Process Management
    IDLE_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    MAX_BUFFER_SIZE: 1000, // Keep last 1000 lines of logs
    GRACEFUL_SHUTDOWN_TIMEOUT: 2000, // 2 seconds

    // Server Configuration
    DEFAULT_CTX_SIZE: '2048',
    DEFAULT_PORT: 8080,

    // Model Sizing (MB)
    SIZE_THRESHOLD: {
        SMALL: 5000,   // < 5GB
        MEDIUM: 10000, // < 10GB
        LARGE: 20000,  // < 20GB
        HUGE: 40000    // < 40GB (70B models)
    },

    // GPU Layers (Conservative estimates)
    GPU_LAYERS: {
        SMALL: 99, // All layers
        MEDIUM: 75,
        LARGE: 60,
        VERY_LARGE: 40,
        HUGE: 25   // ~30-40% of 70B model
    },

    // Generation Speed (Tokens/sec conservative estimates)
    SPEED: {
        SMALL: 50,
        MEDIUM: 30,
        LARGE: 20,
        HUGE: 10
    },

    // Timeouts (ms)
    TIMEOUT: {
        BASE_OVERHEAD: 5000,
        MIN: {
            SMALL: 15000,
            MEDIUM: 30000,
            LARGE: 45000,
            HUGE: 90000
        },
        LOADING: {
            SMALL: 120000,  // 2 mins
            MEDIUM: 180000, // 3 mins
            LARGE: 240000,  // 4 mins
            HUGE: 300000    // 5 mins
        }
    },

    // Task Multipliers
    TASK_MULTIPLIER: {
        EXPANSION: 1.5,
        COMPLETION: 1.2,
        CLASSIFICATION: 1.0
    },

    // Retry Logic
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
    HEALTH_CHECK_INTERVAL: 30000, // 30s
    MEMORY_HEADROOM_MB: 4096 // 4GB overhead
};

export const PROMPTS_CONSTANTS = {
    DEFAULT_MUTATION_COUNT: 8,
    DEFAULT_EXPANSION_DETAIL: 'detailed',
    DEFAULT_N_PREDICT: {
        CLASSIFICATION: 128,
        COMPLETION: 256,
        EXPANSION: 3000,
        MUTATION: 4000,
        REORGANIZATION: 4000
    }
};
