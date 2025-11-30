import { describe, it, expect, beforeEach } from 'vitest';
import { ScaffoldService } from '../../src/services/ScaffoldService';
import { selectTemplate } from '../../src/services/templates';
import type { ScaffoldTemplate } from '../../src/types/transformation';

describe('ScaffoldService', () => {
    let service: ScaffoldService;

    beforeEach(() => {
        service = new ScaffoldService(undefined); // No vault for tests
    });

    describe('selectTemplate', () => {
        it('should select project template for saas category', () => {
            const template = selectTemplate('saas');
            expect(template.id).toBe('project');
        });

        it('should select game-mechanic template for game category', () => {
            const template = selectTemplate('game');
            expect(template.id).toBe('game-mechanic');
        });

        it('should select narrative-seed template for story category', () => {
            const template = selectTemplate('story');
            expect(template.id).toBe('narrative-seed');
        });

        it('should select hardware-concept template for hardware category', () => {
            const template = selectTemplate('hardware');
            expect(template.id).toBe('hardware-concept');
        });

        it('should select generic template for unknown category', () => {
            const template = selectTemplate('unknown');
            expect(template.id).toBe('generic-idea');
        });

        it('should select generic template for empty category', () => {
            const template = selectTemplate('');
            expect(template.id).toBe('generic-idea');
        });
    });

    describe('generateScaffold', () => {
        it('should generate scaffold with variable substitution', async () => {
            const ideaText = 'A productivity app';
            const category = 'saas';
            const result = await service.generateScaffold(ideaText, category);

            expect(result).toContain('A productivity app');
            expect(result).toContain('saas');
            expect(result).toContain('## Overview');
        });

        it('should include questions in sections', async () => {
            const result = await service.generateScaffold('Test idea', 'saas');
            
            expect(result).toContain('### Questions to Consider');
            expect(result).toContain('What are the core features');
        });

        it('should handle empty idea text', async () => {
            const result = await service.generateScaffold('', 'saas');
            expect(result).toContain('## Overview');
        });

        it('should use provided idea name', async () => {
            const result = await service.generateScaffold('Test idea', 'saas', 'MyApp');
            expect(result).toContain('MyApp');
        });
    });

    describe('getAvailableTemplates', () => {
        it('should return all templates', () => {
            const templates = service.getAvailableTemplates();
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.some(t => t.id === 'project')).toBe(true);
            expect(templates.some(t => t.id === 'generic-idea')).toBe(true);
        });
    });

    describe('isAvailable', () => {
        it('should always return true', () => {
            expect(service.isAvailable()).toBe(true);
        });
    });
});

