#!/usr/bin/env node

/**
 * Utility script to calculate SHA256 checksums for downloaded model files
 * Run this script to get checksums for all downloaded models, then add them to ModelManager.ts
 * 
 * Usage: node scripts/calculate-model-checksums.js
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const MODELS = {
    'phi-3.5-mini': {
        fileName: 'Phi-3.5-mini-instruct-Q8_0.gguf',
        name: 'Phi-3.5 Mini'
    },
    'qwen-2.5-7b': {
        fileName: 'Qwen2.5-7B-Instruct-Q8_0.gguf',
        name: 'Qwen 2.5 7B'
    },
    'llama-3.1-8b': {
        fileName: 'Meta-Llama-3.1-8B-Instruct-Q8_0.gguf',
        name: 'Llama 3.1 8B'
    },
    'llama-3.3-70b': {
        fileName: 'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
        name: 'Llama 3.3 70B'
    }
};

async function calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = require('fs').createReadStream(filePath);
        
        // Ensure stream is destroyed on any error
        const cleanup = () => {
            if (!stream.destroyed) {
                stream.destroy();
            }
        };
        
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => {
            try {
                const result = hash.digest('hex');
                cleanup();
                resolve(result);
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
        stream.on('error', (error) => {
            cleanup();
            reject(error);
        });
    });
}

async function main() {
    const homeDir = os.homedir();
    const modelDir = path.join(homeDir, '.ideatr', 'models');
    
    console.log('Calculating SHA256 checksums for downloaded models...\n');
    console.log('Model directory:', modelDir);
    console.log('='.repeat(60));
    
    const results = [];
    
    for (const [key, config] of Object.entries(MODELS)) {
        const filePath = path.join(modelDir, config.fileName);
        
        try {
            await fs.access(filePath);
            console.log(`\n${config.name} (${key}):`);
            console.log(`  File: ${config.fileName}`);
            console.log(`  Calculating checksum...`);
            
            const checksum = await calculateSHA256(filePath).catch(error => {
                console.log(`  ✗ Error: ${error.message}`);
                return null;
            });
            
            if (checksum) {
                console.log(`  ✓ SHA256: ${checksum}`);
                results.push({ key, name: config.name, checksum });
            }
        } catch (error) {
            console.log(`\n${config.name} (${key}):`);
            console.log(`  ✗ File not found: ${config.fileName}`);
        }
    }
    
    if (results.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('\nChecksums to add to ModelManager.ts:\n');
        
        for (const { key, name, checksum } of results) {
            console.log(`    '${key}': {`);
            console.log(`        // ... existing config ...`);
            console.log(`        sha256: '${checksum}',`);
            console.log(`    },`);
        }
    } else {
        console.log('\nNo downloaded models found. Download models first, then run this script.');
    }
}

main().catch(console.error);

