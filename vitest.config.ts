import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'obsidian': path.resolve(__dirname, './test/mocks/obsidian.ts')
        }
    },
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'test/',
                '**/*.test.ts',
                'esbuild.config.mjs',
                'version-bump.mjs'
            ]
        }
    }
});
