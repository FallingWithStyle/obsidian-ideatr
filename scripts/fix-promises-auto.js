#!/usr/bin/env node

/**
 * Automated Promise Handling Fixer
 * 
 * This script helps systematically fix promise handling issues across the codebase.
 * It identifies common patterns and suggests fixes.
 */

const fs = require('fs');
const path = require('path');

// Common patterns to fix:
const PATTERNS = {
    // Pattern 1: Event listeners with async calls
    eventListener: {
        regex: /addEventListener\(['"](\w+)['"],\s*\(\)\s*=>\s*this\.(\w+)\(\)/g,
        fix: (match, event, method) => `addEventListener('${event}', () => void this.${method}())`,
        description: 'Event listener with unhandled async call'
    },

    // Pattern 2: Unhandled async method calls
    unhandledAsync: {
        regex: /^\s+this\.(\w+)\(\);$/gm,
        fix: (match, method) => match.replace(`this.${method}()`, `void this.${method}().catch(error => Logger.warn('${method} failed:', error))`),
        description: 'Unhandled async method call'
    },

    // Pattern 3: setTimeout/setInterval with async
    timerAsync: {
        regex: /set(Timeout|Interval)\(\(\)\s*=>\s*\{([^}]+)this\.(\w+)\(\);/g,
        fix: (match, timerType, prefix, method) => match.replace(`this.${method}()`, `void this.${method}()`),
        description: 'Timer callback with unhandled async call'
    }
};

// Files that need fixing (from review)
const FILES_TO_FIX = [
    'src/services/LlamaService.ts',
    'src/views/DashboardView.ts',
    'src/views/FirstLaunchSetupModal.ts',
    'src/views/GuidedIdeationModal.ts',
    'src/settings/sections/LLMSettingsSection.ts',
    'src/settings/sections/CloudAISettingsSection.ts',
    // Add more as needed
];

console.log('Promise Handling Fixer');
console.log('======================');
console.log('');
console.log('This script will help fix promise handling issues.');
console.log('Run with --apply to automatically apply fixes.');
console.log('');
console.log(`Files to process: ${FILES_TO_FIX.length}`);
console.log('');

// Export for use
module.exports = { PATTERNS, FILES_TO_FIX };
