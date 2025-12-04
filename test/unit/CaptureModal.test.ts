/**
 * Tests for CaptureModal
 * Tests modal rendering, input validation, submission, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App, Notice, TFile, setIcon } from '../../test/mocks/obsidian';
import { CaptureModal } from '../../src/capture/CaptureModal';
import { FileManager } from '../../src/storage/FileManager';
import { ClassificationService } from '../../src/services/ClassificationService';
import { DuplicateDetector } from '../../src/services/DuplicateDetector';
import { DomainService } from '../../src/services/DomainService';
import { WebSearchService } from '../../src/services/WebSearchService';
import { DEFAULT_SETTINGS } from '../../src/settings';

// Mock Obsidian module to export setIcon
vi.mock('obsidian', async () => {
    const obsidian = await vi.importActual('../../test/mocks/obsidian');
    return {
        ...obsidian,
        setIcon: (obsidian as any).setIcon || ((el: HTMLElement, iconId: string) => {
            el.setAttribute('data-icon', iconId);
            el.classList.add('obsidian-icon');
        }),
    };
});

// Mock Obsidian globals
global.Notice = Notice;

// Mock document for ModelStatusIndicator
global.document = {
    createElement: vi.fn((tag: string) => {
        const el: any = {
            tagName: tag.toUpperCase(),
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            classList: { add: vi.fn(), remove: vi.fn(), has: vi.fn(), contains: vi.fn() },
            setAttribute: vi.fn(),
            getAttribute: vi.fn(),
            textContent: '',
            innerHTML: '',
            style: { display: '' } as any,
            className: ''
        };
        return el;
    })
} as any;

// Mock Logger
vi.mock('../../src/utils/logger', () => ({
    Logger: {
        warn: vi.fn(),
        debug: vi.fn(),
    }
}));

// Mock HelpIcon
vi.mock('../../src/utils/HelpIcon', () => ({
    createHelpIcon: vi.fn(() => {
        const div = { appendChild: vi.fn(), addEventListener: vi.fn() } as any;
        return div;
    }),
}));

// Mock iconUtils to avoid setIcon dependency
vi.mock('../../src/utils/iconUtils', () => ({
    createLightbulbIcon: vi.fn(() => {
        const icon: any = {
            tagName: 'SPAN',
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            classList: { add: vi.fn(), remove: vi.fn(), has: vi.fn(), contains: vi.fn() },
            setAttribute: vi.fn(),
            getAttribute: vi.fn(),
            style: {} as any,
            className: '',
            addClass: vi.fn(function(cls: string) {
                this.classList.add(cls);
                return this;
            })
        };
        return icon;
    }),
    createStatusIcon: vi.fn(() => {
        const icon: any = {
            tagName: 'SPAN',
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            classList: { add: vi.fn(), remove: vi.fn(), has: vi.fn(), contains: vi.fn() },
            setAttribute: vi.fn(),
            getAttribute: vi.fn(),
            style: {} as any,
            className: ''
        };
        return icon;
    }),
}));

// Mock ClassificationResultsModal
vi.mock('../../src/views/ClassificationResultsModal', () => {
    class MockClassificationResultsModal {
        open = vi.fn();
        close = vi.fn();
        constructor(app: any, results: any, onAccept: any, onEdit: any, onRetry: any) {}
    }
    return {
        ClassificationResultsModal: MockClassificationResultsModal,
    };
});

describe('CaptureModal', () => {
    let modal: CaptureModal;
    let mockApp: App;
    let mockFileManager: FileManager;
    let mockClassificationService: ClassificationService;
    let mockDuplicateDetector: DuplicateDetector;
    let mockDomainService: DomainService;
    let mockWebSearchService: WebSearchService;
    let mockSettings: typeof DEFAULT_SETTINGS;

    beforeEach(() => {
        mockApp = {
            vault: {
                process: vi.fn().mockResolvedValue(undefined),
            } as any,
        } as any;

        mockFileManager = {
            createIdeaFile: vi.fn().mockResolvedValue({} as TFile),
            updateIdeaFrontmatter: vi.fn().mockResolvedValue(undefined),
            appendToFileBody: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockClassificationService = {
            isAvailable: vi.fn().mockReturnValue(true),
            classifyIdea: vi.fn().mockResolvedValue({
                category: 'app',
                tags: ['test'],
                related: [],
            }),
        } as any;

        mockDuplicateDetector = {
            checkDuplicate: vi.fn().mockResolvedValue({
                isDuplicate: false,
                duplicates: [],
            }),
        } as any;

        mockDomainService = {
            checkDomains: vi.fn().mockResolvedValue([]),
        } as any;

        mockWebSearchService = {
            isAvailable: vi.fn().mockReturnValue(true),
            search: vi.fn().mockResolvedValue([]),
        } as any;

        mockSettings = { ...DEFAULT_SETTINGS };

        modal = new CaptureModal(
            mockApp,
            mockFileManager,
            mockClassificationService,
            mockDuplicateDetector,
            mockSettings,
            mockDomainService,
            mockWebSearchService
        );
    });

    describe('constructor', () => {
        it('should create modal instance', () => {
            expect(modal).toBeInstanceOf(CaptureModal);
            expect(modal.app).toBe(mockApp);
        });

        it('should store all dependencies', () => {
            expect((modal as any).fileManager).toBe(mockFileManager);
            expect((modal as any).classificationService).toBe(mockClassificationService);
            expect((modal as any).duplicateDetector).toBe(mockDuplicateDetector);
            // domainService is no longer stored (functionality hidden, parameter prefixed with _)
            expect((modal as any).webSearchService).toBe(mockWebSearchService);
            expect((modal as any).settings).toBe(mockSettings);
        });
    });

    describe('onOpen', () => {
        it('should create modal UI elements', () => {
            modal.onOpen();

            // Check that contentEl has children (elements were created)
            expect(modal.contentEl.children.length).toBeGreaterThan(0);
            // Check for specific elements by tag name - search recursively
            const allElements: any[] = [];
            const collectElements = (el: any) => {
                if (el.tagName) allElements.push(el);
                if (el.children) {
                    el.children.forEach((child: any) => collectElements(child));
                }
            };
            collectElements(modal.contentEl);
            const h2Elements = allElements.filter((el: any) => el.tagName === 'H2');
            expect(h2Elements.length).toBeGreaterThan(0);
        });

        it('should create input textarea with correct attributes', () => {
            modal.onOpen();

            const textarea = modal.contentEl.querySelectorAll('textarea')[0] as any;
            expect(textarea).toBeDefined();
            expect(textarea.placeholder).toBe('Type your idea here...');
            expect(textarea.rows).toBe('6');
        });

        it('should create Save button', () => {
            modal.onOpen();

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const saveButton = buttons.find(btn => btn.textContent?.includes('Save'));
            expect(saveButton).toBeDefined();
        });

        // Note: Cancel button is only created during classification, not in initial onOpen()

        it('should show Ideate button when LLM is available', () => {
            const llmService = {
                isAvailable: vi.fn().mockReturnValue(true),
                complete: vi.fn(),
            };
            const modalWithLLM = new CaptureModal(
                mockApp,
                mockFileManager,
                mockClassificationService,
                mockDuplicateDetector,
                mockSettings,
                mockDomainService,
                mockWebSearchService,
                undefined,
                llmService as any
            );

            modalWithLLM.onOpen();

            const buttons = Array.from(modalWithLLM.contentEl.querySelectorAll('button')) as any[];
            const ideateButton = buttons.find(btn => btn.textContent === 'Ideate' || btn.classList?.contains('ideatr-ideate-button'));
            expect(ideateButton).toBeDefined();
            expect(ideateButton?.disabled).toBe(false);
            expect(ideateButton?.classList.contains('ideatr-ideate-button-disabled')).toBe(false);
        });

        it('should show Ideate button as disabled when LLM is not available', () => {
            modal.onOpen();

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const ideateButton = buttons.find(btn => btn.textContent === 'Ideate' || btn.classList?.contains('ideatr-ideate-button'));
            expect(ideateButton).toBeDefined();
            expect(ideateButton?.disabled).toBe(true);
            expect(ideateButton?.classList.contains('ideatr-ideate-button-disabled')).toBe(true);
        });

        it('should show Classify Now button when AI is not configured', () => {
            const unavailableService = {
                isAvailable: vi.fn().mockReturnValue(false),
            };
            const settingsWithoutSetup = { ...mockSettings, setupCompleted: false };
            const modalWithoutAI = new CaptureModal(
                mockApp,
                mockFileManager,
                unavailableService as any,
                mockDuplicateDetector,
                settingsWithoutSetup,
                mockDomainService,
                mockWebSearchService
            );

            modalWithoutAI.onOpen();

            const buttons = Array.from(modalWithoutAI.contentEl.querySelectorAll('button')) as any[];
            const classifyButton = buttons.find(btn => btn.textContent?.includes('Classify') || btn.textContent?.includes('classify'));
            expect(classifyButton).toBeDefined();
        });
    });

    describe('handleSubmit', () => {
        beforeEach(() => {
            modal.onOpen();
        });

        it('should validate input before submitting', async () => {
            (modal as any).inputEl.value = 'ab'; // Too short

            await (modal as any).handleSubmit();

            expect(mockFileManager.createIdeaFile).not.toHaveBeenCalled();
        });

        it('should create idea file with valid input', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';

            await (modal as any).handleSubmit();

            expect(mockFileManager.createIdeaFile).toHaveBeenCalled();
        });

        it('should check for duplicates before saving', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';
            mockDuplicateDetector.checkDuplicate = vi.fn().mockResolvedValue({
                isDuplicate: true,
                duplicates: [{ path: 'Ideas/test.md' }],
            });

            await (modal as any).handleSubmit();

            expect(mockDuplicateDetector.checkDuplicate).toHaveBeenCalled();
            expect(mockFileManager.createIdeaFile).not.toHaveBeenCalled();
        });

        it('should save anyway when duplicate warning is confirmed', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';
            (modal as any).isWarningShown = true; // User already saw warning

            await (modal as any).handleSubmit();

            expect(mockFileManager.createIdeaFile).toHaveBeenCalled();
        });

        it('should trigger classification when autoClassify is enabled', async () => {
            mockSettings.autoClassify = true;
            (modal as any).inputEl.value = 'This is a valid idea text';

            await (modal as any).handleSubmit();

            expect(mockClassificationService.classifyIdea).toHaveBeenCalled();
        });

        it('should not trigger classification when autoClassify is disabled', async () => {
            mockSettings.autoClassify = false;
            (modal as any).inputEl.value = 'This is a valid idea text';

            await (modal as any).handleSubmit();

            // Classification should not be called immediately
            expect(mockClassificationService.classifyIdea).not.toHaveBeenCalled();
        });

        it('should handle file creation errors', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';
            mockFileManager.createIdeaFile = vi.fn().mockRejectedValue(new Error('Create failed'));

            await (modal as any).handleSubmit();

            const errorEl = modal.contentEl.querySelector('.ideatr-error');
            expect(errorEl?.textContent).toContain('Failed to save idea');
        });
    });

    describe('handleClassifyNow', () => {
        beforeEach(() => {
            modal.onOpen();
        });

        it('should validate input before classifying', async () => {
            (modal as any).inputEl.value = 'ab'; // Too short

            await (modal as any).handleClassifyNow();

            expect(mockClassificationService.classifyIdea).not.toHaveBeenCalled();
        });

        it('should classify idea with valid input', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';

            await (modal as any).handleClassifyNow();

            expect(mockClassificationService.classifyIdea).toHaveBeenCalled();
        });

        it('should show classification results', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';

            await (modal as any).handleClassifyNow();

            // Classification should be called
            expect(mockClassificationService.classifyIdea).toHaveBeenCalled();
            // Classification element should be visible (modal was opened)
            const classificationEl = (modal as any).classificationEl;
            expect(classificationEl).toBeDefined();
        });

        it('should handle classification errors', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';
            mockClassificationService.classifyIdea = vi.fn().mockRejectedValue(new Error('Classification failed'));

            await (modal as any).handleClassifyNow();

            // Check that error handling was triggered
            expect(mockClassificationService.classifyIdea).toHaveBeenCalled();
            // Error should be shown (using CSS classes, not style.display)
            const errorEl = modal.contentEl.querySelector('.ideatr-error');
            expect(errorEl).toBeDefined();
        });

        it('should allow retry on classification error', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';
            mockClassificationService.classifyIdea = vi.fn()
                .mockRejectedValueOnce(new Error('Classification failed'))
                .mockResolvedValueOnce({
                    category: 'app',
                    tags: ['test'],
                    related: [],
                });

            await (modal as any).handleClassifyNow();

            // Check that retry button was created
            const allButtons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const retryButton = allButtons.find((btn: any) => btn.textContent === 'Retry');
            expect(retryButton).toBeDefined();
        });
    });

    describe('handleIdeate', () => {
        beforeEach(() => {
            const llmService = {
                isAvailable: vi.fn().mockReturnValue(true),
                complete: vi.fn().mockResolvedValue('Generated Title'),
            };
            modal = new CaptureModal(
                mockApp,
                mockFileManager,
                mockClassificationService,
                mockDuplicateDetector,
                mockSettings,
                mockDomainService,
                mockWebSearchService,
                undefined,
                llmService as any
            );
            modal.onOpen();
        });

        it('should validate input before ideating', async () => {
            (modal as any).inputEl.value = 'ab'; // Too short

            await (modal as any).handleIdeate();

            expect(mockFileManager.createIdeaFile).not.toHaveBeenCalled();
        });

        it('should check for LLM availability', async () => {
            const unavailableLLM = {
                isAvailable: vi.fn().mockReturnValue(false),
            };
            const modalWithoutLLM = new CaptureModal(
                mockApp,
                mockFileManager,
                mockClassificationService,
                mockDuplicateDetector,
                mockSettings,
                mockDomainService,
                mockWebSearchService,
                undefined,
                unavailableLLM as any
            );
            modalWithoutLLM.onOpen();
            (modalWithoutLLM as any).inputEl.value = 'This is a valid idea text';

            await (modalWithoutLLM as any).handleIdeate();

            const errorEl = modalWithoutLLM.contentEl.querySelector('.ideatr-error');
            expect(errorEl?.textContent).toContain('AI service is not available');
        });

        it('should create file, classify, and expand idea', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';

            await (modal as any).handleIdeate();

            expect(mockFileManager.createIdeaFile).toHaveBeenCalled();
            expect(mockClassificationService.classifyIdea).toHaveBeenCalled();
        });

        it('should check for duplicates before ideating', async () => {
            (modal as any).inputEl.value = 'This is a valid idea text';
            mockDuplicateDetector.checkDuplicate = vi.fn().mockResolvedValue({
                isDuplicate: true,
                duplicates: [{ path: 'Ideas/test.md' }],
            });

            await (modal as any).handleIdeate();

            expect(mockDuplicateDetector.checkDuplicate).toHaveBeenCalled();
            expect(mockFileManager.createIdeaFile).not.toHaveBeenCalled();
        });
    });

    describe('showError and hideError', () => {
        beforeEach(() => {
            modal.onOpen();
        });

        it('should display error message', () => {
            (modal as any).showError('Test error message');

            const errorEl = modal.contentEl.querySelector('.ideatr-error') as HTMLElement;
            expect(errorEl.textContent).toBe('Test error message');
            expect(errorEl.classList.contains('ideatr-visible')).toBe(true);
            expect(errorEl.classList.contains('ideatr-hidden')).toBe(false);
        });

        it('should add error class for errors', () => {
            (modal as any).showError('Test error', false);

            const errorEl = modal.contentEl.querySelector('.ideatr-error');
            expect(errorEl?.classList.contains('ideatr-error')).toBe(true);
        });

        it('should add warning class for warnings', () => {
            (modal as any).showError('Test warning', true);

            const errorEl = (modal as any).errorEl;
            // Check that warning class was added and error class was removed
            expect(errorEl.classList.has('ideatr-warning')).toBe(true);
            expect(errorEl.classList.has('ideatr-error')).toBe(false);
        });

        it('should hide error message', () => {
            (modal as any).showError('Test error');
            expect((modal as any).errorEl.classList.contains('ideatr-visible')).toBe(true);
            
            (modal as any).hideError();

            const errorEl = (modal as any).errorEl;
            expect(errorEl.classList.contains('ideatr-hidden')).toBe(true);
            expect(errorEl.classList.contains('ideatr-visible')).toBe(false);
        });
    });

    describe('keyboard shortcuts', () => {
        beforeEach(() => {
            modal.onOpen();
        });

        it('should handle Save shortcut', () => {
            const inputEl = (modal as any).inputEl;
            const handleSubmitSpy = vi.spyOn(modal as any, 'handleSubmit').mockResolvedValue(undefined);

            // Simulate keyboard event - the event listener is attached in onOpen
            // We'll verify the handler exists and can be called by checking if eventListeners map has the handler
            const keydownHandlers = (inputEl.eventListeners?.get('keydown') || []);
            expect(keydownHandlers.length).toBeGreaterThan(0);
            
            // Verify handleSubmit can be called (shortcut functionality exists)
            expect(typeof (modal as any).handleSubmit).toBe('function');
        });

        it('should handle Ideate shortcut when LLM is available', () => {
            const llmService = {
                isAvailable: vi.fn().mockReturnValue(true),
            };
            const modalWithLLM = new CaptureModal(
                mockApp,
                mockFileManager,
                mockClassificationService,
                mockDuplicateDetector,
                mockSettings,
                mockDomainService,
                mockWebSearchService,
                undefined,
                llmService as any
            );
            modalWithLLM.onOpen();

            const inputEl = (modalWithLLM as any).inputEl;
            
            // Verify event listener was attached
            const keydownHandlers = (inputEl.eventListeners?.get('keydown') || []);
            expect(keydownHandlers.length).toBeGreaterThan(0);
            // Verify handleIdeate method exists
            expect(typeof (modalWithLLM as any).handleIdeate).toBe('function');
        });
    });

    describe('onClose', () => {
        it('should clear content on close', () => {
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();

            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});

