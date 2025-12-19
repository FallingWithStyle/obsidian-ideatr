import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { ResurfacingService } from '../../src/services/ResurfacingService';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import type { Vault, TFile } from 'obsidian';
import type { IdeatrSettings } from '../../src/settings';
import { ManagementError, ManagementErrorCode } from '../../src/types/management';
import { Logger } from '../../src/utils/logger';

// Minimal mock Vault for these tests
function createMockVault(): Vault {
    return {
        getMarkdownFiles: vi.fn(() => []),
        read: vi.fn(async () => ''),
        getAbstractFileByPath: vi.fn(() => null),
        on: vi.fn(() => () => {}),
        create: vi.fn(async () => ({ path: '', name: '', stat: { mtime: Date.now() } } as TFile))
    } as unknown as Vault;
}

describe('ManagementError usage (QA 4.6)', () => {
    beforeEach(() => {
        // Enable debug mode so Logger.warn calls console.warn
        // Logger.debugMode is a static property that controls debug output
        (Logger as any).debugMode = true;
    });

    afterEach(() => {
        // Reset debug mode
        (Logger as any).debugMode = false;
        (Logger as any).debugFileExists = false;
        (Logger as any).debugFileChecked = false;
    });

    it('IdeaRepository.getAllIdeas should log ManagementError with FILE_READ_ERROR on read failure', async () => {
        const vault = createMockVault();
        const parser = new FrontmatterParser();
        const repo = new IdeaRepository(vault, parser);

        const file = { path: 'Ideas/bad.md', name: 'bad.md', stat: { mtime: Date.now() } } as TFile;
        vi.mocked(vault.getMarkdownFiles).mockReturnValue([file]);
        vi.mocked(vault.read).mockRejectedValueOnce(new Error('read failed'));

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const ideas = await repo.getAllIdeas();

        expect(ideas).toEqual([]); // still graceful
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        // Logger.warn calls console.warn('[Ideatr]', ...args), so the ManagementError is the second arg
        const callArgs = consoleWarnSpy.mock.calls[0];
        const errorArg = callArgs[callArgs.length - 1]; // Last argument is the error
        expect(errorArg).toBeInstanceOf(ManagementError);
        expect((errorArg as ManagementError).code).toBe(ManagementErrorCode.FILE_READ_ERROR);

        consoleWarnSpy.mockRestore();
    });

    it('ResurfacingService.identifyOldIdeas should log ManagementError with DATE_PARSE_ERROR on invalid date', async () => {
        const vault = createMockVault();
        const parser = new FrontmatterParser();
        const repo = new IdeaRepository(vault, parser);
        const settings: Partial<IdeatrSettings> = { resurfacingThresholdDays: 7 };

        // Mock repository to return an idea with invalid created date
        const badIdea: any = {
            frontmatter: {
                type: 'idea',
                status: 'captured',
                created: 'not-a-date',
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            },
            body: 'Body',
            filename: 'bad.md'
        };

        const getAllIdeasSpy = vi.spyOn(repo, 'getAllIdeas').mockResolvedValue([badIdea]);

        const service = new ResurfacingService(repo, settings, vault);
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const ideas = await service.identifyOldIdeas();

        expect(ideas).toEqual([]); // invalid dates should be skipped
        expect(getAllIdeasSpy).toHaveBeenCalled();
        // Logger.warn calls console.warn('[Ideatr]', ...args), so the ManagementError is the last arg
        const calls = consoleWarnSpy.mock.calls.filter(call => {
            // Find calls that include a ManagementError
            return call.some(arg => arg instanceof ManagementError);
        });
        expect(calls.length).toBeGreaterThanOrEqual(1);
        const errorCall = calls[0];
        const errorArg = errorCall.find(arg => arg instanceof ManagementError);
        expect(errorArg).toBeInstanceOf(ManagementError);
        expect((errorArg as ManagementError).code).toBe(ManagementErrorCode.DATE_PARSE_ERROR);

        consoleWarnSpy.mockRestore();
    });
});



